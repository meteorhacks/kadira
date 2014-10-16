setLabels = function () {
  // name Session.prototype.send
  var originalSend = MeteorX.Session.prototype.send;
  MeteorX.Session.prototype.send = function kadira_Session_send () {
    var args = Array.prototype.slice.call(arguments);
    return originalSend.apply(this, args);
  }

  // name mongodb.Connection.createDataHandler
  var mongodb = MongoInternals.NpmModule;
  var originalCreateDataHandler = mongodb.Connection.createDataHandler;
  mongodb.Connection.createDataHandler = function () {
    var args = Array.prototype.slice.call(arguments);
    var originalHandler = originalCreateDataHandler.apply(this, args);
    return function kadira_MongoDB_dataHandler () {
      var args = Array.prototype.slice.call(arguments);
      return originalHandler.apply(this, args);
    }
  }
}
