var mongoConnectionProto = getMongoConnectionProto();

//findOne is handled by find - so no need to track it
//upsert is handles by update
['find', 'update', 'remove', 'insert', '_ensureIndex', '_dropIndex'].forEach(function(func) {
  var originalFunc = mongoConnectionProto[func];
  mongoConnectionProto[func] = function(collName, selector, mod, options) {
    var payload = {
      coll: collName,
      func: func,
    };

    if(func == 'insert') {
      //add nothing more to the payload  
    } else if(func == '_ensureIndex' || func == '_dropIndex') {
      //add index
      payload.index = selector;
    } else if(func == 'update' && options.upsert) {
      payload.func = 'upsert';
      payload.selector = selector;
    } else {
      //all the other functions have selectors
      payload.selector = selector;
    }
    
    NotificationManager.methodTrackEvent('db', payload);

    var ret = originalFunc.apply(this, arguments);
    NotificationManager.methodTrackEvent('dbend');

    if(func == 'find' && !ret.constructor.prototype._ampOk) {
      hijackCursor(ret.constructor.prototype);
    }

    return ret;
  };
});

function hijackCursor(cursorProto) {
  ['forEach', 'map', 'fetch', 'count'].forEach(function(type) {
    var originalFunc = cursorProto[type];
    cursorProto[type] = function() {
      var cursorDescription = this._cursorDescription;
      var payload = {
        coll: cursorDescription.collectionName,
        selector: cursorDescription.selector,
        func: type
      };

      NotificationManager.methodTrackEvent('db', payload);
      var ret = originalFunc.apply(this, arguments);
      NotificationManager.methodTrackEvent('dbend');

      return ret;
    };
  });

  cursorProto._ampOk = true;
}

function getMongoConnectionProto() {
  var coll = new Meteor.Collection('__apm_dummy_collection__');
  //we need wait until db get connected with meteor, .findOne() does that
  coll.findOne();
  return MongoInternals.defaultRemoteCollectionDriver().mongo.constructor.prototype;
}