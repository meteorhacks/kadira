var Fibers = Npm.require('fibers');
MethodsStore = {};
var hostname = Npm.require('os').hostname();

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data, ampInfo) {
  if(!Fibers.current) {
    //we don't need to track methodEvents when there don't exists a fiber
    return;
  }

  ampInfo = ampInfo || Fibers.current.__apmInfo;
  if(ampInfo && ampInfo.method) {
    var method = this._ensureMethodExists(ampInfo);
    if(type =='asyncstart' && this._isLastEventIsStart(method)) {
      return false;
    }

    var event = {type: type, at: Date.now()};
    if(data) {
      event.data = data;
    }
    method.events.push(event);
    console.log('method::', type, ampInfo, data);
    return true;
  } else {
    return false;
  }
};

_NotficationManager.prototype._ensureMethodExists = function(ampInfo) {
  var id = ampInfo.session + "::" + ampInfo.method.id;
  if(!MethodsStore[id]) {
    MethodsStore[id] = {
      _id: id,
      host: hostname,
      name: ampInfo.method.name,
      session: ampInfo.session,
      methodId: ampInfo.method.id,
      events: []
    };
  }
  return MethodsStore[id];
};

_NotficationManager.prototype._isLastEventIsStart = function(method) {
  var lastEvent = method.events[method.events.length -1];
  if(lastEvent && ['dbstart', 'httpstart', 'cursorstart'].indexOf(lastEvent.type) >= 0) {
    return true;
  } else {
    return false;
  }
};

NotificationManager = new _NotficationManager();
