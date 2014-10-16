Tinytest.add(
  'CPU Profiler - set labels - Session.prototype.send',
  function (test) {
    test.equal(MeteorX.Session.prototype.send.name, 'kadira_Session_send');
  }
);

Tinytest.add(
  'CPU Profiler - set labels - mongodb.Connection.createDataHandler',
  function (test) {
    var mongodb = MongoInternals.NpmModule;
    var handler = mongodb.Connection.createDataHandler();
    test.equal(handler.name, 'kadira_MongoDB_dataHandler');
  }
);

Tinytest.add(
  'CPU Profiler - set labels - MongoCursor methods',
  function (test) {
    var cursorProto = MeteorX.MongoCursor.prototype;
    ['forEach', 'map', 'fetch', 'count', 'observeChanges', 'observe', 'rewind']
    .forEach(function (name) {
      test.equal(cursorProto[name].name, 'kadira_Cursor_'+name);
    });
  }
);

Tinytest.add(
  'CPU Profiler - set labels - Multiplexer.prototype._sendAdds',
  function (test) {
    var name = MeteorX.Multiplexer.prototype._sendAdds.name;
    test.equal(name, 'kadira_Multiplexer_sendAdds');
  }
);

Tinytest.add(
  'CPU Profiler - set labels - MongoConnection methods',
  function (test) {
    var cursorProto = MeteorX.MongoConnection.prototype;
    ['insert', 'update', 'remove'].forEach(function (name) {
      test.equal(cursorProto['_'+name].name, 'kadira_MongoConnection_'+name);
    });
  }
);
