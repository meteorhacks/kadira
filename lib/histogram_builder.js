var HistoUtils = Npm.require('histo-utils');

HistogramBuilder = function HistogramBuilder(name, options) {
  this._name = name;
  options = options || {};
  this._expireCheckInterval = options.expireCheckInterval || 1000 * 20;
  this._maxAge = options.maxAge || 1000 * 70;

  this._currentTime = null;
  this._byMinutes = {};
  this._readyToSend = [];
  this._buildHandler = 
    setInterval(
      this._buildExpiredHistograms.bind(this), 
      this._expireCheckInterval
    );
  this._logger = Npm.require('debug')('kadira:hbuilder:' + this._name);
};

HistogramBuilder.prototype.add = function(timeInMinute, name, resTime) {
  if(this._currentTime !== timeInMinute) {
    if(this._currentTime !== null && this._currentTime > timeInMinute) {
      // we don't need to collect older data
      this._logger("receiving old data for %s at %d", name, timeInMinute);
      return false;
    }

    this._buildHistograms();
    this._currentTime = timeInMinute;
  }

  var histogram = this._getHistogram(timeInMinute, name);
  histogram.addPoints([resTime]);
  return true;
};

HistogramBuilder.prototype.collectHistograms = function() {
  var payload = this._readyToSend;
  this._readyToSend = [];
  return payload;
};

HistogramBuilder.prototype._getHistogram = function(timeInMinute, name) {
  if(!this._byMinutes[timeInMinute]) {
    this._byMinutes[timeInMinute] = {};
  }

  if(!this._byMinutes[timeInMinute][name]) {
    this._byMinutes[timeInMinute][name] = HistoUtils.create();
  }

  return this._byMinutes[timeInMinute][name];
};

HistogramBuilder.prototype._buildHistograms = function() {
  for(var time in this._byMinutes) {
    this._buildHistogramsForMinute(time);
  }

  this._byMinutes = {};
};

HistogramBuilder.prototype._buildHistogramsForMinute = function(time) {
  for(var name in this._byMinutes[time]) {
    var histogram = this._byMinutes[time][name];
    this._readyToSend.push({
      time: parseInt(time),
      name: name,
      histogram: histogram.build()
    });
  }
};

HistogramBuilder.prototype._buildExpiredHistograms = function() {
  var validMinutes = {};
  for(var time in this._byMinutes) {
    var diff = (new Date().getTime()) - time;
    if(diff > this._maxAge) {
      this._buildHistograms(time);
    } else {
      validMinutes[time] = this._byMinutes[time];
    }
  }

  this._byMinutes = validMinutes;
};

HistogramBuilder.prototype.stop = function() {
  clearInterval(this._buildHandler);
};