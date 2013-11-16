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

    if(func == 'find' && !ret.constructor.prototype._ampOk) {
      hijackCursor(ret.constructor.prototype);
    }

    return ret;
  };
});

function hijackCursor(cursorProto) {
  ['forEach', 'map', 'rewind', 'fetch', 'count'].forEach(function(type) {
    var originalFunc = cursorProto[type];
    cursorProto[type] = function() {
      var cursorDescription = this._cursorDescription;
      var payload = {
        coll: cursorDescription.collectionName,
        selector: cursorDescription.selector,
        func: type
      };

      NotificationManager.methodTrackEvent('cursorstart', payload);
      var ret = originalFunc.apply(this, arguments);
      NotificationManager.methodTrackEvent('cursorend');

      return ret;
    };
  });

  cursorProto._ampOk = true;
}