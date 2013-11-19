var Fibers = Npm.require('fibers');

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data, ampInfo) {
  if(!Fibers.current) {
    //we don't need to track methodEvents when there don't exists a fiber
    return;
  }

  ampInfo = ampInfo || Fibers.current.__apmInfo;
  if(ampInfo && ampInfo.method) {
    var method = Apm.models.methods.getMethod(ampInfo);
    if(type =='async' && this._isLastEventIsStart(method)) {
      return false;
    }

    var event = {type: type, at: Date.now()};
    if(data) {
      event.data = data;
    }
    method.events.push(event);
    console.log("event:", type, method._id);
    return true;
  } else {
    return false;
  }
};

_NotficationManager.prototype._isLastEventIsStart = function(method) {
  var lastEvent = method.events[method.events.length -1];
  if(lastEvent && ['db', 'http', 'email'].indexOf(lastEvent.type) >= 0) {
    return true;
  } else {
    return false;
  }
};

NotificationManager = new _NotficationManager();
