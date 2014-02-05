PubsubModel = function() {

}

PubsubModel.prototype._trackSub = function(session, msg) {
  console.log('SUB:', session.id, msg.id, msg.name, msg.params);
  //track the count
  //keep the date created
};

PubsubModel.prototype._trackUnsub = function(session, msg) {
  console.log('UNSUB:', session.id, msg.id, msg.error);
  //track the count
  //use the current date to get the lifetime of the subscription
};

PubsubModel.prototype._trackReady = function(session, sub) {
  console.log('READY:', session.id, sub._subscriptionId);
  //use the current time to track the response time
};

PubsubModel.prototype._trackDataImpact = function(session, sub, event, collection, id, fields) {
  console.log('DI:' + event, session.id, sub._subscriptionId, collection, id, fields);
};

PubsubModel.prototype.buildPayload = function() {
  return {};
};