PubsubModel = function() {
  this.metricsByMinute = {};
  this.subscriptions = {};
}

PubsubModel.prototype._trackSub = function(session, msg) {
  console.log('SUB:', session.id, msg.id, msg.name, msg.params);
  var publication = msg.name;
  var subscriptionId = msg.id;
  var timestamp = Apm.syncedDate.getTime();
  var metrics = this._getMetrics(timestamp, publication);

  metrics.subs++;
  this.subscriptions[msg.id] = {
    startTime: timestamp,
    publication: publication,
    params: msg.params,
    id: msg.id
  };
};

PubsubModel.prototype._trackUnsub = function(session, sub) {
  console.log('UNSUB:', session.id, sub._subscriptionId);
  var publication = sub._name;
  var subscriptionId = sub._subscriptionId;
  var subscriptionState = this.subscriptions[subscriptionId];
  
  //sometime, we don't have these states
  if(subscriptionState) {
    var timestamp = Apm.syncedDate.getTime();
    var metrics = this._getMetrics(timestamp, publication);

    //track the count
    metrics.unsubs++;
    //use the current date to get the lifeTime of the subscription
    metrics.lifeTime += timestamp - this.subscriptions[subscriptionId].startTime;
    delete this.subscriptions[subscriptionId];
  }
};

PubsubModel.prototype._trackReady = function(session, sub) {
  console.log('READY:', session.id, sub._subscriptionId);
  //use the current time to track the response time
  var publication = sub._name;
  var subscriptionId = sub._subscriptionId;
  var timestamp = Apm.syncedDate.getTime();
  var metrics = this._getMetrics(timestamp, publication);

  metrics.resTime += timestamp - this.subscriptions[subscriptionId].startTime;
};

PubsubModel.prototype._trackDataImpact = function(session, sub, event, collection, id, fields) {
  console.log('DI:' + event, session.id, sub._subscriptionId, collection, id, fields);
  if(event != 'removed' && _.keys(fields).length > 0) {
    var publication = sub._name;
    var subscriptionId = sub._subscriptionId;
    var timestamp = Apm.syncedDate.getTime();
    var metrics = this._getMetrics(timestamp, publication);

    metrics.dataImpact += Buffer.byteLength(JSON.stringify(fields));
  }
};

PubsubModel.prototype._getMetrics = function(timestamp, publication) {
  var date = new Date(timestamp);
  var dateId = date.getHours() + ':' + date.getMinutes();
  
  this.metricsByMinute[dateId] = this.metricsByMinute[dateId] || {
    startTime: timestamp,
    pubs: {}
  };

  this.metricsByMinute[dateId].pubs[publication] = this.metricsByMinute[dateId].pubs[publication] || {
    subs: 0,
    unsubs: 0,
    resTime: 0,
    dataImpact: 0,
    count: 0,
    lifeTime: 0
  };

  return this.metricsByMinute[dateId].pubs[publication];
};

PubsubModel.prototype.buildPayload = function(buildDetailInfo) {
  var metricsByMinute = this.metricsByMinute;
  this.metricsByMinute = {};

  var payload = {
    pubMetrics: []
  };

  //to the averaging
  for(var dateId in metricsByMinute) {
    for(var publication in metricsByMinute[dateId].pubs) {
      var singlePubMetrics = metricsByMinute[dateId].pubs[publication];
      //we only calculate resTime for new subscriptions only
      singlePubMetrics.resTime /= singlePubMetrics.subs;
      //we only track lifeTime in the unsubs
      singlePubMetrics.lifeTime /= singlePubMetrics.unsubs;
    }

    payload.pubMetrics.push(metricsByMinute[dateId]);
  }

  return payload;
};