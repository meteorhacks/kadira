var logger = Npm.require('debug')('kadira:pubsub');

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
  logger('SUB:', session.id, msg.id, msg.name, msg.params);
  var publication = this._getPublicationName(msg.name);
  var subscriptionId = msg.id;
  var timestamp = Ntp._now();
  var metrics = this._getMetrics(timestamp, publication);

  metrics.subs++;
  this.subscriptions[msg.id] = {
    // We use localTime here, because when we used synedTime we might get
    // minus or more than we've expected
    //   (before serverTime diff changed overtime)
    startTime: timestamp,
    publication: publication,
    params: msg.params,
    id: msg.id
  };

  //set session startedTime
  session._startTime = session._startTime || timestamp;
};

_.extend(PubsubModel.prototype, KadiraModel.prototype);

PubsubModel.prototype._trackUnsub = function(session, sub) {
  logger('UNSUB:', session.id, sub._subscriptionId);
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var subscriptionState = this.subscriptions[subscriptionId];

  var startTime = null;
  //sometime, we don't have these states
  if(subscriptionState) {
    startTime = subscriptionState.startTime;
  } else {
    //if this is null subscription, which is started automatically
    //hence, we don't have a state
    startTime = session._startTime;
  }

  //in case, we can't get the startTime
  if(startTime) {
    var timestamp = Ntp._now();
    var metrics = this._getMetrics(timestamp, publication);
    //track the count
    if(sub._name != null) {
      // we can't track subs for `null` publications.
      // so we should not track unsubs too
      metrics.unsubs++;
    }
    //use the current date to get the lifeTime of the subscription
    metrics.lifeTime += timestamp - startTime;
    //this is place we can clean the subscriptionState if exists
    delete this.subscriptions[subscriptionId];
  }
};

PubsubModel.prototype._trackReady = function(session, sub, trace) {
  logger('READY:', session.id, sub._subscriptionId);
  //use the current time to track the response time
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var timestamp = Ntp._now();
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
  var timestamp = Ntp._now();
  var metrics = this._getMetrics(timestamp, publication);

  metrics.errors++;

  if(trace) {
    this.tracerStore.addTrace(trace);
  }
};

PubsubModel.prototype._getMetrics = function(timestamp, publication) {
  var dateId = this._getDateId(timestamp);

  if(!this.metricsByMinute[dateId]) {
    this.metricsByMinute[dateId] = {
      // startTime needs to be convert to serverTime before sending to the server
      startTime: timestamp,
      pubs: {}
    };
  }

  if(!this.metricsByMinute[dateId].pubs[publication]) {
    this.metricsByMinute[dateId].pubs[publication] = {
      subs: 0,
      unsubs: 0,
      resTime: 0,
      activeSubs: 0,
      activeDocs: 0,
      lifeTime: 0,
      totalObservers: 0,
      cachedObservers: 0,
      createdObservers: 0,
      deletedObservers: 0,
      errors: 0,
      observerLifetime: 0,
      docChangesUpdated: 0,
      docChangesInserted: 0,
      docChangesDeleted: 0,
      polledDocuments: 0
    };
  }

  return this.metricsByMinute[dateId].pubs[publication];
};

PubsubModel.prototype._getPublicationName = function(name) {
  return name || "null(autopublish)";
};

PubsubModel.prototype._getSubscriptionInfo = function() {
  var self = this;
  var activeSubs = {};
  var activeDocs = {};
  var totalDocsSent = {};
  var totalDataSent = {};
  var totalObservers = {};
  var cachedObservers = {};

  for(var sessionId in Meteor.default_server.sessions) {
    var session = Meteor.default_server.sessions[sessionId];
    _.each(session._namedSubs, countSubData);
    _.each(session._universalSubs, countSubData);
  }

  var avgObserverReuse = {};
  _.each(totalObservers, function(value, publication) {
    avgObserverReuse[publication] = cachedObservers[publication] / totalObservers[publication];
  });

  return {
    activeSubs: activeSubs,
    activeDocs: activeDocs,
    avgObserverReuse: avgObserverReuse
  };

  function countSubData (sub) {
    var publication = self._getPublicationName(sub._name);
    countSubscriptions(sub, publication);
    countDocuments(sub, publication);
    countObservers(sub, publication);
  }

  function countSubscriptions (sub, publication) {
    activeSubs[publication] = activeSubs[publication] || 0;
    activeSubs[publication]++;
  }

  function countDocuments (sub, publication) {
    activeDocs[publication] = activeDocs[publication] || 0;
    for(collectionName in sub._documents) {
      activeDocs[publication] += _.keys(sub._documents[collectionName]).length;
    }
  }

  function countObservers(sub, publication) {
    totalObservers[publication] = totalObservers[publication] || 0;
    cachedObservers[publication] = cachedObservers[publication] || 0;

    totalObservers[publication] += sub._totalObservers;
    cachedObservers[publication] += sub._cachedObservers;
  }
}

PubsubModel.prototype.buildPayload = function(buildDetailInfo) {
  var metricsByMinute = this.metricsByMinute;
  this.metricsByMinute = {};

  var payload = {
    pubMetrics: []
  };

  var subscriptionData = this._getSubscriptionInfo();
  var activeSubs = subscriptionData.activeSubs;
  var activeDocs = subscriptionData.activeDocs;
  var avgObserverReuse = subscriptionData.avgObserverReuse;

  //to the averaging
  for(var dateId in metricsByMinute) {
    var dateMetrics = metricsByMinute[dateId];
    // We need to convert startTime into actual serverTime
    dateMetrics.startTime = Kadira.syncedDate.syncTime(dateMetrics.startTime);

    for(var publication in metricsByMinute[dateId].pubs) {
      var singlePubMetrics = metricsByMinute[dateId].pubs[publication];
      // We only calculate resTime for new subscriptions
      singlePubMetrics.resTime /= singlePubMetrics.subs;
      singlePubMetrics.resTime = singlePubMetrics.resTime || 0;
      // We only track lifeTime in the unsubs
      singlePubMetrics.lifeTime /= singlePubMetrics.unsubs;
      singlePubMetrics.lifeTime = singlePubMetrics.lifeTime || 0;

      // Count the average for observer lifetime
      if(singlePubMetrics.deletedObservers > 0) {
        singlePubMetrics.observerLifetime /= singlePubMetrics.deletedObservers;
      } 

      // If there are two ore more dateIds, we will be using the currentCount for all of them.
      // We can come up with a better solution later on.
      singlePubMetrics.activeSubs = activeSubs[publication] || 0;
      singlePubMetrics.activeDocs = activeDocs[publication] || 0;
      singlePubMetrics.avgObserverReuse = avgObserverReuse[publication] || 0;
    }
    
    payload.pubMetrics.push(metricsByMinute[dateId]);
  }

  //collect traces and send them with the payload
  payload.pubRequests = this.tracerStore.collectTraces();

  return payload;
};

PubsubModel.prototype.incrementHandleCount = function(trace, isCached) {
  var publicationName = trace.name;
  var timestamp = Ntp._now();
  var publication = this._getMetrics(timestamp, publicationName);

  var session = Meteor.default_server.sessions[trace.session];
  if(session) {
    var sub = session._namedSubs[trace.id];
    if(sub) {
      sub._totalObservers = sub._totalObservers || 0;
      sub._cachedObservers = sub._cachedObservers || 0;
    }
  }
  // not sure, we need to do this? But I don't need to break the however
  sub = sub || {_totalObservers:0 , _cachedObservers: 0};

  publication.totalObservers++;
  sub._totalObservers++;
  if(isCached) {
    publication.cachedObservers++;
    sub._cachedObservers++;
  }
}

PubsubModel.prototype.trackCreatedObserver = function(info) {
  var timestamp = Ntp._now();
  var publication = this._getMetrics(timestamp, info.name);
  publication.createdObservers++;
}

PubsubModel.prototype.trackDeletedObserver = function(info) {
  var timestamp = Ntp._now();
  var publication = this._getMetrics(timestamp, info.name);
  publication.deletedObservers++;
  publication.observerLifetime += (new Date()).getTime() - info.startTime;
}

PubsubModel.prototype.trackDocumentChanges = function(info, op) {
  // It's possibel that info to be null
  // Specially when getting changes at the very begining.
  // This may be false, but nice to have a check
  if(!info) {
    return
  }

  var timestamp = Ntp._now();
  var publication = this._getMetrics(timestamp, info.name);
  if(op.op === "d") {
    publication.docChangesDeleted++;
  } else if(op.op === "i") {
    publication.docChangesInserted++;
  } else if(op.op === "u") {
    publication.docChangesUpdated++;
  }
}

PubsubModel.prototype.trackPolledDocuments = function(info, count) {
  var timestamp = Ntp._now();
  var publication = this._getMetrics(timestamp, info.name);
  publication.polledDocuments += count;
}