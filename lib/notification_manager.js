var Fibers = Npm.require('fibers');
MethodsStore = {};
var hostname = Npm.require('os').hostname();

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data) {
  var ampInfo = Fibers.current.__apmInfo;
  if(ampInfo && ampInfo.method) {
    var method = this._ensureMethodExists(ampInfo);
    var event = {type: type, at: Date.now()};
    if(data) {
      event.data = data;
    }
    method.events.push(event);
    console.log('method::', type, Fibers.current.__apmInfo, data);
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

NotificationManager = new _NotficationManager();
