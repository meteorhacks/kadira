var eventLogger = Npm.require('debug')('apm:nm:event');
var REPITITIVE_EVENTS = {'db': true, 'http': true, 'email': true, 'wait': true, 'async': true};

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data, apmInfo) {
  apmInfo = apmInfo || Apm._getInfo();

  if(apmInfo && apmInfo.method) {
    //expecting a end event
    var eventId = true;
    var method = apmInfo.method;

    //specially handling for repitivive events like db, http
    if(REPITITIVE_EVENTS[type]) {
      //can't accept a new start event
      if(method._lastEventId) {
        return false;
      }
      eventId = method._lastEventId = Random.id();
    }

    var event = {type: type, at: Apm.syncedDate.getTime()};
    if(data) {
      event.data = data;
    }
    method.events.push(event);
    eventLogger("%s %s", type, method._id);
    return eventId;
  } else {
    return false;
  }
};

_NotficationManager.prototype.methodTrackEventEnd = function(eventId, type, data, apmInfo) {
  apmInfo = apmInfo || Apm._getInfo();

  if(apmInfo && apmInfo.method) {
    var method = apmInfo.method;

    if(method._lastEventId && method._lastEventId == eventId) {
      type = type + 'end';
      var event = {type: type, at: Apm.syncedDate.getTime()};
      if(data) {
        event.data = data;
      }
      method.events.push(event);
      eventLogger("%s %s", type, method._id);

      method._lastEventId = null;
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

_NotficationManager.prototype.methodEndLastEvent = function(apmInfo) {
  apmInfo = apmInfo || Apm._getInfo();

  if(apmInfo && apmInfo.method) {
    var method = apmInfo.method;
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

NotificationManager = new _NotficationManager();
