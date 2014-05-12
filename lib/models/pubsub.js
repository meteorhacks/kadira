var logger = Npm.require('debug')('apm:pubsub');

PubsubModel = function() {
  this.metricsByMinute = {};
  this.subscriptions = {};

  this.tracerStore = new TracerStore({
    interval: 1000 * 60, //process traces every minute
    maxTotalPoints: 30, //for 30 minutes
    archiveEvery: 5 //always trace for every 5 minutes,
  });

  this.tracerStore.start();
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

  //set session startedTime
  session._startTime = session._startTime || timestamp;
};

_.extend(PubsubModel.prototype, ApmModel.prototype);

PubsubModel.prototype._trackUnsub = function(session, sub) {
  logger('UNSUB:', session.id, sub._subscriptionId);
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var subscriptionState = this.subscriptions[subscriptionId];

  var startTime = null;
  var route = null;
  //sometime, we don't have these states
  if(subscriptionState) {
    startTime = subscriptionState.startTime;
    route = subscriptionState.route;
  } else {
    //if this is null subscription, which is started automatically
    //hence, we don't have a state
    startTime = session._startTime;
  }

  //in case, we can't get the startTime
  if(startTime) {
    var timestamp = Apm.syncedDate.getTime();
    var metrics = this._getMetrics(timestamp, publication);
    //track the count
    metrics.unsubs++;
    //use the current date to get the lifeTime of the subscription
    metrics.lifeTime += timestamp - startTime;

    if(route){
      metrics.unsubRoutes = metrics.unsubRoutes || {};
      metrics.unsubRoutes[route] = metrics.unsubRoutes[route] || 0;
      metrics.unsubRoutes[route]++;
    }

    //this is place we can clean the subscriptionState if exists
    delete this.subscriptions[subscriptionId];
  }
};

PubsubModel.prototype._trackReady = function(session, sub, trace) {
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

  if(trace) {
    this.tracerStore.addTrace(trace);
  }
};

PubsubModel.prototype._trackError = function(session, sub, trace) {
  logger('ERROR:', session.id, sub._subscriptionId);
  //use the current time to track the response time
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var timestamp = Apm.syncedDate.getTime();
  var metrics = this._getMetrics(timestamp, publication);

  metrics.errors++;

  if(trace) {
    this.tracerStore.addTrace(trace);
  }
};

PubsubModel.prototype._trackNetworkImpact = function(session, sub, event, collection, id, fields) {
  logger('DI:' + event, session.id, sub._subscriptionId, collection, id);
  if(event != 'removed' && _.keys(fields).length > 0) {
    var subscriptionId = sub._subscriptionId;
    var subscriptionState = this.subscriptions[subscriptionId];

    var publication = this._getPublicationName(sub._name);
    var timestamp = Apm.syncedDate.getTime();
    var metrics = this._getMetrics(timestamp, publication);

    if(subscriptionState) {
      if(subscriptionState.readyTracked) {
        //using JSON instead of EJSON to save the CPU usage
        var bytes = Buffer.byteLength(JSON.stringify(fields));
        if(event == 'added') {
          metrics.bytesAddedAfterReady += Buffer.byteLength(JSON.stringify(fields));
        } else if(event == 'changed') {
          metrics.bytesChangedAfterReady += Buffer.byteLength(JSON.stringify(fields));
        };
      } else {
        metrics.bytesBeforeReady += Buffer.byteLength(JSON.stringify(fields));
      }
    }
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
    bytesBeforeReady: 0,
    bytesAddedAfterReady: 0,
    bytesChangedAfterReady: 0,
    activeSubs: 0,
    lifeTime: 0,
    totalObservers: 0,
    cachedObservers: 0,
    errors: 0
  };

  return this.metricsByMinute[dateId].pubs[publication];
};

PubsubModel.prototype._getPublicationName = function(name) {
  return name || "null(autopublish)";
};

PubsubModel.prototype._countSubscriptions = function() {
  var self = this;
  var countMap = {};
  for(var sessionId in Meteor.default_server.sessions) {
    var session = Meteor.default_server.sessions[sessionId];
    //count normal subs
    _.each(session._namedSubs, function(sub) {
      var publication = self._getPublicationName(sub._name);
      countMap[publication] = countMap[publication] || 0;
      countMap[publication]++;
    });

    //count null subs
    var nullPublication = self._getPublicationName(null);
    countMap[nullPublication] = countMap[nullPublication] || 0;
    countMap[nullPublication]++;
  }

  return countMap;
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
      // We only calculate resTime for new subscriptions
      singlePubMetrics.resTime /= singlePubMetrics.subs;
      // We only track lifeTime in the unsubs
      singlePubMetrics.lifeTime /= singlePubMetrics.unsubs;

      // This is a very efficient solution. We can come up with another solution
      // which maintains the count inside the API.
      // But for now, this is the most reliable method.

      // If there are two ore more dateIds, we will be using the currentCount for all of them.
      // We can come up with a better solution later on.
      singlePubMetrics.activeSubs = subscriptionCount[publication];
    }
    payload.pubMetrics.push(metricsByMinute[dateId]);
  }

  //collect traces and send them with the payload
  payload.pubRequests = this.tracerStore.collectTraces();

  return payload;
};

PubsubModel.prototype.incrementHandleCount = function(publicationName, isCached) {
  var timestamp = Apm.syncedDate.getTime();
  var publication = this._getMetrics(timestamp, publicationName);
  publication.totalObservers++;
  if(isCached) {
    publication.cachedObservers++;
  }
}
