var originalSend = Meteor.default_connection._send;

Meteor.default_connection._send = function (msg) {
  if(typeof Router !== "undefined" && Router.current()){
    var routeName = Router.current().route.name;
    if(msg.msg == "sub"){
      msg.route = routeName;
    }
  }
  return originalSend.call(this, msg);
}
