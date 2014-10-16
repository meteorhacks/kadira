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

  // name Multiplexer initial adds
  var originalSendAdds = MeteorX.Multiplexer.prototype._sendAdds;
  MeteorX.Multiplexer.prototype._sendAdds = function kadira_Multiplexer_sendAdds () {
    var args = Array.prototype.slice.call(arguments);
    return originalSendAdds.apply(this, args);
  }

  // name MongoCursor methods
  var cursorProto = MeteorX.MongoCursor.prototype;
  var originalCursorForEach =  cursorProto.forEach;
  cursorProto.forEach = function kadira_Cursor_forEach () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorForEach.apply(this, args);
  }

  var originalCursorMap =  cursorProto.map;
  cursorProto.map = function kadira_Cursor_map () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorMap.apply(this, args);
  }

  var originalCursorFetch =  cursorProto.fetch;
  cursorProto.fetch = function kadira_Cursor_fetch () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorFetch.apply(this, args);
  }

  var originalCursorCount =  cursorProto.count;
  cursorProto.count = function kadira_Cursor_count () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorCount.apply(this, args);
  }

  var originalCursorObserveChanges =  cursorProto.observeChanges;
  cursorProto.observeChanges = function kadira_Cursor_observeChanges () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorObserveChanges.apply(this, args);
  }

  var originalCursorObserve =  cursorProto.observe;
  cursorProto.observe = function kadira_Cursor_observe () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorObserve.apply(this, args);
  }

  var originalCursorRewind =  cursorProto.rewind;
  cursorProto.rewind = function kadira_Cursor_rewind () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorRewind.apply(this, args);
  }
}
