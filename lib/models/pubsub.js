var logger = Npm.require('debug')('apm:pubsub');

PubsubModel = function() {
  this.metricsByMinute = {};
  this.subscriptions = {};
}

PubsubModel.prototype._trackSub = function(session, msg) {
  logger('SUB:', session.id, msg.id, msg.name, msg.params, msg.route);
  var publication = this._getPublicationName(msg.name);
  var subscriptionId = msg.id;
  var timestamp = Apm.syncedDate.getTime();
  var metrics = this._getMetrics(timestamp, publication);

  metrics.subs++;

  var route = msg.route;
  if(route !== undefined){
    metrics.subRoutes = metrics.subRoutes || {};
    metrics.subRoutes[route] = metrics.subRoutes[route] || 0;
    metrics.subRoutes[route]++;    
  }

  this.subscriptions[msg.id] = {
    startTime: timestamp,
    publication: publication,
    params: msg.params,
    route: msg.route,
    id: msg.id
  };
};

_.extend(PubsubModel.prototype, ApmModel.prototype);

PubsubModel.prototype._trackUnsub = function(session, sub) {
  logger('UNSUB:', session.id, sub._subscriptionId);
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var subscriptionState = this.subscriptions[subscriptionId];
  //sometime, we don't have these states
  if(subscriptionState) {
    var timestamp = Apm.syncedDate.getTime();
    var metrics = this._getMetrics(timestamp, publication);
    //track the count
    metrics.unsubs++;
    //use the current date to get the lifeTime of the subscription
    metrics.lifeTime += timestamp - subscriptionState.startTime;

    var route = subscriptionState.route;
    if(route){
      metrics.unsubRoutes = metrics.unsubRoutes || {};
      metrics.unsubRoutes[route] = metrics.unsubRoutes[route] || 0;
      metrics.unsubRoutes[route]++;
    }

    //this is place we can clean the subscriptionState if exists
    delete this.subscriptions[subscriptionId];
  }
};

PubsubModel.prototype._trackReady = function(session, sub) {
  logger('READY:', session.id, sub._subscriptionId);
  //use the current time to track the response time
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var timestamp = Apm.syncedDate.getTime();
  var metrics = this._getMetrics(timestamp, publication);

  var subscriptionState = this.subscriptions[subscriptionId];
  if(subscriptionState && !subscriptionState.readyTracked) {
    metrics.resTime += timestamp - subscriptionState.startTime;
    subscriptionState.readyTracked = true;
  }
};

PubsubModel.prototype._trackNetworkImpact = function(session, sub, event, collection, id, fields) {
  logger('DI:' + event, session.id, sub._subscriptionId, collection, id);
  if(event != 'removed' && _.keys(fields).length > 0) {
    var publication = this._getPublicationName(sub._name);
    var subscriptionId = sub._subscriptionId;
    var timestamp = Apm.syncedDate.getTime();
    var metrics = this._getMetrics(timestamp, publication);

    metrics.networkImpact += Buffer.byteLength(EJSON.stringify(fields));
  }
};

PubsubModel.prototype._getMetrics = function(timestamp, publication) {
  var dateId = this._getDateId(timestamp);
  
  this.metricsByMinute[dateId] = this.metricsByMinute[dateId] || {
    startTime: timestamp,
    pubs: {}
  };

  this.metricsByMinute[dateId].pubs[publication] = this.metricsByMinute[dateId].pubs[publication] || {
    subs: 0,
    unsubs: 0,
    resTime: 0,
    networkImpact: 0,
    activeSubs: 0,
    lifeTime: 0
  };

  return this.metricsByMinute[dateId].pubs[publication];
};

PubsubModel.prototype._getPublicationName = function(name) {
  return name || "null(autopublish)";
};

PubsubModel.prototype._countSubscriptions = function() {
  var count = 0;
  for(var sessionId in Meteor.default_server.sessions) {
    var session = Meteor.default_server.sessions[sessionId];
    count += _.keys(session._namedSubs).length;
  }
  return count;
};

PubsubModel.prototype.buildPayload = function(buildDetailInfo) {
  var metricsByMinute = this.metricsByMinute;
  this.metricsByMinute = {};

  var payload = {
    pubMetrics: []
  };

  var subscriptionCount = this._countSubscriptions();

  //to the averaging
  for(var dateId in metricsByMinute) {
    for(var publication in metricsByMinute[dateId].pubs) {
      var singlePubMetrics = metricsByMinute[dateId].pubs[publication];
      //we only calculate resTime for new subscriptions only
      singlePubMetrics.resTime /= singlePubMetrics.subs;
      //we only track lifeTime in the unsubs
      singlePubMetrics.lifeTime /= singlePubMetrics.unsubs;

      //this is very ifficient solution, we can comeup with another solution
      //which maintains the count inside the API.
      //but for now, this is the most reliable method. 

      //If there are two ore more dateIds, we will be using the currentCount for all of them
      //we can come up with a better solution later on with the above solution
      singlePubMetrics.activeSubs = subscriptionCount;
    }
    payload.pubMetrics.push(metricsByMinute[dateId]);
  }
  
  return payload;
};