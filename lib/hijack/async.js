var Fibers = Npm.require('fibers');

var originalYield = Fibers.yield;
Fibers.yield = function() {
  var apmInfo = Kadira._getInfo();
  if(apmInfo) {
    var eventId = Kadira.tracer.event(apmInfo.trace, 'async');;
    if(eventId) {
      Fibers.current._apmEventId = eventId;
    }
  }

  originalYield();
};

var originalRun = Fibers.prototype.run;
Fibers.prototype.run = function(val) {
  if(this._apmEventId) {
    var apmInfo = Kadira._getInfo(this);
    Kadira.tracer.eventEnd(apmInfo.trace, this._apmEventId);
    this._apmEventId = null;
  }
  originalRun.call(this, val);
};
