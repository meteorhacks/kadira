var Fibers = Npm.require('fibers');

var originalYield = Fibers.yield;
Fibers.yield = function() {
  var apmInfo = Apm._getInfo();
  if(apmInfo) {
    var eventId = Apm.tracer.event(apmInfo.trace, 'async');;
    if(eventId) {
      Fibers.current._apmEventId = eventId;
    }
  }

  originalYield();
};

var originalRun = Fibers.prototype.run;
Fibers.prototype.run = function(val) {
  if(this._apmEventId) {
    var apmInfo = Apm._getInfo(this);
    Apm.tracer.eventEnd(apmInfo.trace, this._apmEventId);
    this._apmEventId = null;
  }
  originalRun.call(this, val);
};
