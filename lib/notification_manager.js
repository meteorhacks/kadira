var Fibers = Npm.require('fibers');
var eventLogger = Npm.require('debug')('apm:nm:event');

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data, ampInfo) {
  ampInfo = ampInfo || Fibers.current.__apmInfo;

  if(ampInfo && ampInfo.method) {
    var method = ampInfo.method;
    if(type =='async' && this._isLastEventIsStart(method)) {
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
  ampInfo = ampInfo || Fibers.current.__apmInfo;

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

_NotficationManager.prototype._isLastEventIsStart = function(method) {
  var lastEvent = method.events[method.events.length -1];
  if(lastEvent && ['idle', 'db', 'http', 'email'].indexOf(lastEvent.type) >= 0) {
    return true;
  } else {
    return false;
  }
};

NotificationManager = new _NotficationManager();
