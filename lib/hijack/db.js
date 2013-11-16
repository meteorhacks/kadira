['find', 'findOne', 'update', 'remove', 'upsert', 'insert'].forEach(function(func) {
  var originalFunc = Meteor.Collection.prototype[func];
  Meteor.Collection.prototype[func] = function(selector) {
    var payload = {
      coll: this._name,
      func: func,
    };

    if(func == 'insert') {
      NotificationManager.methodTrackEvent('dbstart', payload);  
    } else {
      payload.selector = selector;
      NotificationManager.methodTrackEvent('dbstart', payload);
    }

    var ret = originalFunc.apply(this, arguments);
    NotificationManager.methodTrackEvent('dbend');

    return ret;
  };
});