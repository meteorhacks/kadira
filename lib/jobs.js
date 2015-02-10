var Jobs = Kadira.Jobs = {};
Jobs.getAsync = function(id, callback) {
  var payload = {
    action: 'get',
    params: {
      id: id
    }
  };

  Kadira.send(payload, '/jobs', callback);
};

Jobs.setAsync = function(id, changes, callback) {
  var payload = {
    action: 'set',
    params: {
      id: id
    }
  };
  _.extend(payload.params, changes);

  Kadira.send(payload, '/jobs', callback);
};


Jobs.get = Kadira._wrapAsync(Jobs.getAsync);
Jobs.set = Kadira._wrapAsync(Jobs.setAsync);