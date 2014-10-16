setLabels = function () {
  // name Session.prototype.send
  var originalSend = MeteorX.Session.prototype.send;
  MeteorX.Session.prototype.send = function kadira_Session_send () {
    var args = Array.prototype.slice.call(arguments);
    return originalSend.apply(this, args);
  }
}
