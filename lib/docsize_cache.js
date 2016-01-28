var LRU = Npm.require('lru-cache');
var crypto = Npm.require('crypto');

DocSzCache = function (maxItems, maxValues) {
  this.items = new LRU({max: maxItems});
  this.maxValues = maxValues;
}

DocSzCache.prototype.getSize = function (coll, query, opts, data) {
  // If the dataset is null or empty we can't calculate the size
  // Do not process this data and return 0 as the document size.
  if (!(data && data.length)) {
    return 0;
  }

  var key = this.getKey(coll, query, opts);
  var item = this.items.get(key);

  if (!item) {
    item = new DocSzCacheItem(this.maxValues);
    this.items.set(key, item);
  }

  if (this.needsUpdate(item)) {
    var size = JSON.stringify(data[0]).length;
    item.addData(size);
  }

  return item.getValue();
};

DocSzCache.prototype.getKey = function (coll, query, opts) {
  return JSON.stringify([coll, query, opts]);
};

DocSzCache.prototype.needsUpdate = function (item) {
  // handle newly made items
  if (!item.values.length) {
    return true;
  }

  var currentTime = Date.now();
  var timeSinceUpdate = currentTime - item.updated;
  if (timeSinceUpdate > 1000*60) {
    return true;
  }

  var score = item.getScore();
  return score > 0.5;
};


DocSzCacheItem = function (maxValues) {
  this.maxValues = maxValues;
  this.updated = 0;
  this.values = [];
}

DocSzCacheItem.prototype.addData = function (value) {
  this.values.push(value);
  this.updated = Date.now();

  if (this.values.length > this.maxValues) {
    this.values.shift();
  }
};

DocSzCacheItem.prototype.getValue = function () {
  var sorted = this.values.sort();
  var median = 0;

  if (sorted.length % 2 === 0) {
    var idx = sorted.length / 2;
    median = (sorted[idx] + sorted[idx-1]) / 2;
  } else {
    var idx = Math.floor(sorted.length / 2);
    median = sorted[idx];
  }

  return median;
};

DocSzCacheItem.prototype.getScore = function () {
  return [
    (this.maxValues - this.values.length)/this.maxValues,
    (Date.now() - this.updated) / 60000,
    (100 - this.getPcpu()) / 100,
  ].map(function (score) {
    return score > 1 ? 1 : score;
  }).reduce(function (total, score) {
    return (total || 0) + score;
  }) / 3;
};

DocSzCacheItem.prototype.getPcpu = function () {
  var model = Kadira.models.system;
  //XXX: FIXME: return model.currentUsage.cpu || model.getUsage().cpu || 0;
  return 0;
};


Kadira._docsizeCache = new DocSzCache(100000, 10);
