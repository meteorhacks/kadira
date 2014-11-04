Kadira = {};
Kadira.options = {};

if(Meteor.wrapAsync) {
  Kadira._wrapAsync = Meteor.wrapAsync;
} else {
  Kadira._wrapAsync = Meteor._wrapAsync;
}

Kadira._binaryRequire = function(moduleName) {
  if(typeof KadiraBinaryDeps != 'undefined') {
    return KadiraBinaryDeps.require(moduleName);
  } else {
    return Npm.require(moduleName);
  }
};