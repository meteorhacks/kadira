var Fibers = Npm.require('fibers');

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodTrackEvent = function(type, data) {
  console.log('method-track-event', type, Fibers.current.__apmInfo, data);
};

NotificationManager = new _NotficationManager();
