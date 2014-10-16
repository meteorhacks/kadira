Tinytest.add(
  'CPU Profiler - set labels - Session.prototype.send',
  function (test) {
    test.equal(MeteorX.Session.prototype.send.name, 'kadira_Session_send');
  }
);
