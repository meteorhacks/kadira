var Fibers = Npm.require('fibers');

var originalYield = Fibers.yield;
Fibers.yield = function() {
  var kadiraInfo = Kadira._getInfo();
  if(kadiraInfo) {
    var eventId = Kadira.tracer.event(kadiraInfo.trace, 'async');;
    if(eventId) {
      Fibers.current._apmEventId = eventId;
    }
  }

  originalYield();
};

var originalRun = Fibers.prototype.run;
Fibers.prototype.run = function(val) {
  if(this._apmEventId) {
    var kadiraInfo = Kadira._getInfo(this);
    Kadira.tracer.eventEnd(kadiraInfo.trace, this._apmEventId);
    this._apmEventId = null;
  }
  originalRun.call(this, val);
};
