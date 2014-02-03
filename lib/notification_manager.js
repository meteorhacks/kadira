var eventLogger = Npm.require('debug')('apm:nm:event');

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data, ampInfo) {
  ampInfo = ampInfo || Apm._getInfo();

  if(ampInfo && ampInfo.method) {
    var method = ampInfo.method;
    //currently, we don't accept events started inside some other event.
    //so this is blocked here. May be we can do something like this in future
    if(!this._doesMatchWithLastEvent(method, type)) {
      return false;
    }

    var event = {type: type, at: Apm.syncedDate.getTime()};
    if(data) {
      event.data = data;
    }
    method.events.push(event);
    eventLogger("%s %s", type, method._id);
    return true;
  } else {
    return false;
  }
};

_NotficationManager.prototype.methodEndLastEvent = function(ampInfo) {
  ampInfo = ampInfo || Apm._getInfo();

  if(ampInfo && ampInfo.method) {
    var method = ampInfo.method;
    var lastEvent = method.events[method.events.length -1];
    
    if(lastEvent && !/end$/.test(lastEvent.type)) {
      method.events.push({
        type: lastEvent.type + 'end',
        at: Apm.syncedDate.getTime()
      });
    }
  } else {
    return false;
  }
};

_NotficationManager.prototype._doesMatchWithLastEvent = function(method, type) {
  var lastEvent = method.events[method.events.length -1];
  if(lastEvent && ['idle', 'db', 'http', 'email', 'async'].indexOf(lastEvent.type) >= 0) {
    return lastEvent.type + "end" == type;
  } else {
    return true;
  }
};

NotificationManager = new _NotficationManager();
