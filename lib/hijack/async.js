var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

var originalWait = Future.prototype.wait;
Future.prototype.wait = function wait() {
  if(Fibers.current && Fibers.current.__apmInfo && !this._apmInfo) {
    var success = NotificationManager.methodTrackEvent('asyncstart');
    if(success) {
      this._apmInfo = Fibers.current.__apmInfo;
    }
  }
  return originalWait.call(this);
};

var originalReturn = Future.prototype.return;
Future.prototype.return = function(value) {
  if(this._apmInfo) {
    NotificationManager.methodTrackEvent('asyncend', null, this._apmInfo);
  }
  return originalReturn.call(this, value);
};