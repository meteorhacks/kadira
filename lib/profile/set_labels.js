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

  // name MongoConnection insert
  var originalMongoInsert = MeteorX.MongoConnection.prototype._insert;
  MeteorX.MongoConnection.prototype._insert = function kadira_MongoConnection_insert () {
    var args = Array.prototype.slice.call(arguments);
    return originalMongoInsert.apply(this, args);
  }

  // name MongoConnection update
  var originalMongoUpdate = MeteorX.MongoConnection.prototype._update;
  MeteorX.MongoConnection.prototype._update = function kadira_MongoConnection_update () {
    var args = Array.prototype.slice.call(arguments);
    return originalMongoUpdate.apply(this, args);
  }

  // name MongoConnection remove
  var originalMongoRemove = MeteorX.MongoConnection.prototype._remove;
  MeteorX.MongoConnection.prototype._remove = function kadira_MongoConnection_remove () {
    var args = Array.prototype.slice.call(arguments);
    return originalMongoRemove.apply(this, args);
  }

  // name Pubsub added
  var originalPubsubAdded = MeteorX.Session.prototype.sendAdded;
  MeteorX.Session.prototype.sendAdded = function kadira_Session_sendAdded () {
    var args = Array.prototype.slice.call(arguments);
    return originalPubsubAdded.apply(this, args);
  }

  // name Pubsub changed
  var originalPubsubChanged = MeteorX.Session.prototype.sendChanged;
  MeteorX.Session.prototype.sendChanged = function kadira_Session_sendChanged () {
    var args = Array.prototype.slice.call(arguments);
    return originalPubsubChanged.apply(this, args);
  }

  // name Pubsub removed
  var originalPubsubRemoved = MeteorX.Session.prototype.sendRemoved;
  MeteorX.Session.prototype.sendRemoved = function kadira_Session_sendRemoved () {
    var args = Array.prototype.slice.call(arguments);
    return originalPubsubRemoved.apply(this, args);
  }

  // name MongoCursor forEach
  var originalCursorForEach = MeteorX.MongoCursor.prototype.forEach;
  MeteorX.MongoCursor.prototype.forEach = function kadira_Cursor_forEach () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorForEach.apply(this, args);
  }

  // name MongoCursor map
  var originalCursorMap = MeteorX.MongoCursor.prototype.map;
  MeteorX.MongoCursor.prototype.map = function kadira_Cursor_map () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorMap.apply(this, args);
  }

  // name MongoCursor fetch
  var originalCursorFetch = MeteorX.MongoCursor.prototype.fetch;
  MeteorX.MongoCursor.prototype.fetch = function kadira_Cursor_fetch () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorFetch.apply(this, args);
  }

  // name MongoCursor count
  var originalCursorCount = MeteorX.MongoCursor.prototype.count;
  MeteorX.MongoCursor.prototype.count = function kadira_Cursor_count () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorCount.apply(this, args);
  }

  // name MongoCursor observeChanges
  var originalCursorObserveChanges = MeteorX.MongoCursor.prototype.observeChanges;
  MeteorX.MongoCursor.prototype.observeChanges = function kadira_Cursor_observeChanges () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorObserveChanges.apply(this, args);
  }

  // name MongoCursor observe
  var originalCursorObserve = MeteorX.MongoCursor.prototype.observe;
  MeteorX.MongoCursor.prototype.observe = function kadira_Cursor_observe () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorObserve.apply(this, args);
  }

  // name MongoCursor rewind
  var originalCursorRewind = MeteorX.MongoCursor.prototype.rewind;
  MeteorX.MongoCursor.prototype.rewind = function kadira_Cursor_rewind () {
    var args = Array.prototype.slice.call(arguments);
    return originalCursorRewind.apply(this, args);
  }

  // name CrossBar listen
  var originalCrossbarListen = DDPServer._Crossbar.prototype.listen;
  DDPServer._Crossbar.prototype.listen = function kadira_Crossbar_listen () {
    var args = Array.prototype.slice.call(arguments);
    return originalCrossbarListen.apply(this, args);
  }

  // name CrossBar fire
  var originalCrossbarFire = DDPServer._Crossbar.prototype.fire;
  DDPServer._Crossbar.prototype.fire = function kadira_Crossbar_fire () {
    var args = Array.prototype.slice.call(arguments);
    return originalCrossbarFire.apply(this, args);
  }
}
