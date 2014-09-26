BaseErrorModel = function(options) {
  this.filters = [];
};

BaseErrorModel.prototype.addFilter = function(filter) {
  if(typeof filter === 'function') {
    this.filters.push(filter);
  } else {
    throw new Error("Error filter must be a function");
  }
};

BaseErrorModel.prototype.removeFilter = function(filter) {
  var index = this.filters.indexOf(filter);
  if(index >= 0) {
    this.filters.splice(index, 1);
  }
};

BaseErrorModel.prototype.applyFilters = function(type, message, error, subType) {
  for(var lc=0; lc<this.filters.length; lc++) {
    var filter = this.filters[lc];
    try {
      var validated = filter(type, message, error, subType);
      if(!validated) return false;
    } catch (ex) {
      // we need to remove this filter
      // we may ended up in a error cycle
      this.filters.splice(lc, 1);
      throw new Error("an error thrown from a filter you've suplied", ex.message);
    }
  }

  return true;
};