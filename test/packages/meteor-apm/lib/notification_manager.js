var Fibers = Npm.require('fibers');

function _NotficationManager() {
  
}

_NotficationManager.prototype.methodStart = function() {
  console.log('method-start', Fibers.current.__apmInfo);
};

_NotficationManager.prototype.methodCompleted = function() {
  console.log('method-end', Fibers.current.__apmInfo);
};

_NotficationManager.prototype.methodErrored = function(error) {
  console.log('method-errored', Fibers.current.__apmInfo, error);
};

NotificationManager = new _NotficationManager();
