ProcessCPUProfile = function(profile) {
  this.profile = profile;
  this.paths = profile.head.children;
  this._functionsMap = {};
  this.functions = [];
  this.totalHitCount = 0;
};

ProcessCPUProfile.prototype.process = function() {
  var self = this;
  this.paths.forEach(function(path, pathId) {
    if(path.functionName != '(program)') {
      self._buildFunctions(path, pathId);
    }
  });

  this.functions.sort(function(a, b) {
    return b.totalHitCount - a.totalHitCount;
  });
};

ProcessCPUProfile.prototype._buildFunctions = function(node, pathId) {
  var self = this;
  self.totalHitCount += node.hitCount;

  var rootFunc = self._getFunction(node);
  rootFunc.totalHitCount += node.hitCount;
  rootFunc.totalHitCountByPath[pathId] = rootFunc.totalHitCountByPath[pathId] || 0;
  rootFunc.totalHitCountByPath[pathId]+= node.hitCount;

  if(node.children) {
    node.children.forEach(function(child) {
      self._buildFunctions(child, pathId);
    });
  }
};

ProcessCPUProfile.prototype._getFunction = function(functionNode) {
  var key = functionNode.callUID;
  var func = this._functionsMap[key];
  if(!func) {
    this._functionsMap[key] = func = _.omit(functionNode, 'children', 'hitCount');
    func.totalHitCount = 0;
    func.totalHitCountByPath = {};
    this.functions.push(func);
  }
  return func;
};

var a = new ProcessCPUProfile(SampleProfile);
a.process();
console.log("Total HitCount", a.totalHitCount);
console.log(a.functions.slice(0, 3).map(function(o) {
  return _.pick(o, 'functionName', 'url', 'totalHitCount');
}));

