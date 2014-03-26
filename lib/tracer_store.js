TracerStore = function TracerStore(options) {
  options = options || {};

  this.maxTotalPoints = options.maxTotalPoints || 30;
  this.interval = options.interval || 1000 * 60;
  this.archiveEvery = options.archiveEvery || this.maxTotalPoints / 6;

  //store max total on the past 30 minutes (or past 30 items)
  this.maxTotals = {};
  //store the max trace of the current interval
  this.currentMaxTrace = {};
  //archive for the traces
  this.traceArchive = [];

  this.processedCnt = {};
}; 

TracerStore.prototype.addTrace = function(kind, trace) {
  if(!this.currentMaxTrace[kind]) {
    this.currentMaxTrace[kind] = trace;
  } else if(this.currentMaxTrace[kind].metrics.total < trace.metrics.total) {
    this.currentMaxTrace[kind] = trace
  }
};

TracerStore.prototype.collectTraces = function() {
  var traces = this.traceArchive;
  this.traceArchive = [];
  return traces;
};

TracerStore.prototype.start = function() {
  this._timeoutHandler = setInterval(this._processTraces.bind(this), this.interval);
};

TracerStore.prototype.stop = function() {
  if(this._timeoutHandler) {
    clearInterval(this._timeoutHandler);
  }
};

TracerStore.prototype._processTraces = function() {
  var self = this;
  var kinds = _.union(
    _.keys(this.maxTotals),
    _.keys(this.currentMaxTrace)
  );

  kinds.forEach(function(kind) {
    self.processedCnt[kind] = self.processedCnt[kind] || 0;
    var currentMaxTrace = self.currentMaxTrace[kind];
    var currentMaxTotal = currentMaxTrace? currentMaxTrace.metrics.total : 0;
    self.maxTotals[kind] = self.maxTotals[kind] || [];

    var exceedingPoints = self.maxTotals[kind].length - self.maxTotalPoints;
    if(exceedingPoints > 0) {
      self.maxTotals[kind].splice(0, exceedingPoints);
    }

    var archiveDefault = (self.processedCnt[kind] % self.archiveEvery) == 0;
    self.processedCnt[kind]++;

    if(archiveDefault) {
      self.traceArchive.push(currentMaxTrace);
    } else if(self._isOutlier(kind, currentMaxTrace)) {
      self.traceArchive.push(currentMaxTrace);
    }

    //add the current maxPoint
    self.maxTotals[kind].push(currentMaxTotal);

    //reset currentMaxTrace
    self.currentMaxTrace[kind] = null;
  });
};

TracerStore.prototype._isOutlier = function(kind, trace) {
  if(trace) {
    var upperLimit = this._getOutlierUpperLimit(this.maxTotals[kind]);
    console.log('------------', upperLimit);
    return trace.metrics.total > upperLimit;
  } else {
    return false;
  }
};

TracerStore.prototype._getOutlierLimits = function(dataPoints) {
  if(dataPoints.length == 0) {
    return {upper: 0, lower: 0};
  } else if(dataPoints.length == 1) {
    var pont = dataPoints[0];
    return {upper: 0, lower: 0};
  } else {
    var sortedDataPoints = _.clone(dataPoints).sort(function(a, b) {
      return a - b;
    });
     
    var midPosition = Math.ceil(sortedDataPoints.length / 2);
    var meanHalf1 = this._getMean(sortedDataPoints.slice(0, midPosition));
    var meanHalf2 = this._getMean(sortedDataPoints.slice(midPosition));

    console.log('===DP', meanHalf1, meanHalf2);

    var iqr = meanHalf2 - meanHalf1;
    var q1 = this._pickQuartile(sortedDataPoints, 1);
    var q3 = this._pickQuartile(sortedDataPoints, 3);

    var upperLimit = q3 + (1.5 * iqr);
    var lowerLimit = q1 - (1.5 * iqr);

    return {
      upper: upperLimit,
      lower: lowerLimit
    };
  }
};

TracerStore.prototype._pickQuartile = function(dataSet, num) {
  var pos = ((dataSet.length + 1) * num) / 4;
  if(pos % 1 == 0) {
    return dataSet[pos -1];
  } else {
    pos = pos - (pos % 1);
    return (dataSet[pos -1] + dataSet[pos])/2
  }
};

TracerStore.prototype._getMean = function(dataPoints) {
  if(dataPoints.length > 0) {
    var total = 0;
    dataPoints.forEach(function(point) {
      total += point;
    });
    return total/dataPoints.length;
  } else {
    return 0;
  }
};