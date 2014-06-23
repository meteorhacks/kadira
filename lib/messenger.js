var EventEmitter = Npm.require('events').EventEmitter;
var util = Npm.require('util');
var request = Npm.require('request');
var logger = Npm.require('debug')('kadira:messenger');

Messenger = function Messenger(appId, appSecret, endpoint) {
  this._appId = appId;
  this._appSecret = appSecret;
  this._endpoint = endpoint;
};

util.inherits(Messenger, EventEmitter);

Messenger.prototype._handleMessages = function(body) {
  var self = this;
  var messages = body.messages;
  if(messages) {
    messages.forEach(function(message) {
      self.emit('message', message.type, message.data);
    });
  }
};

Messenger.prototype.sendMessage = function(type, data) {
  var self = this;
  var message = {type: type, data: data};
  var retryLogic = new Retry({
    minCount: 0,
    baseTimeout: 5*1000,
    maxTimeout: 60000
  });

  var httpOptions = {
    json: {messages: [message]}
  };

  var callCount = 0;
  function callMessage() {
    callCount++;
    self.sendRequest('POST', '/messenger', httpOptions, function(err, response) {
      if(err || response.statusCode != 200) {
        if(callCount < 5) {
          logger('retrying sendMessage for ' + callCount + ' times.');
          retryLogic.retryLater(callCount, callMessage);
        } else {
          console.error('error sending message: ', err.message);
        }
      }
    });
  }
};

Messenger.prototype.sendRequest = function(method, path, httpOptions, callback) {
  var self = this;
  var options = _.clone(httpOptions);
  options.url = this._endpoint + path;
  options.method = method;
  options.headers = _.extend(options.headers || {}, this._buildAuthHeaders());

  request(options, function(err, response, body) {
    if(!err && typeof(body)) {
      if(typeof(body) == 'object') {
        // body will be a json if user invoking that with json option
        self._handleMessages(body);
      } else if(typeof(body) == 'string') {
        // body is a string and we need to convert the body into json
        // to see whether if we have some messages
        try{
          var parsedBody = JSON.parse(body);
          self._handleMessages(parsedBody);
        } catch(ex) {

        }
      }
    }

    if(callback) callback(err, response, body);
  });
};

Messenger.prototype._buildAuthHeaders = function() {
  return {
    'APM-APP-ID': this._appId,
    'APM-APP-SECRET': this._appSecret
  };
};
