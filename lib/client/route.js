var currentInsideIronRouterStatus = new Meteor.EnvironmentVariable;
var RouteController = Package['iron-router'] && Package['iron-router'].RouteController;

if(RouteController){
  var originalRun = RouteController.prototype.run;
  RouteController.prototype.run = function() {
    var self = this;
    currentInsideIronRouterStatus.withValue(this, function(){
      originalRun.call(self);
    })
  };
}

var originalSend = Meteor.default_connection._send;

Meteor.default_connection._send = function (msg) {
  if(msg.msg == "sub"){
    var routeController = currentInsideIronRouterStatus.get();
    if(routeController){
      var routeName = routeController.route.name;
      msg.route = routeName;
    } else {
      msg.route = null;
    }
  }
  return originalSend.call(this, msg);
}


