Kadira = {};

if(Meteor.wrapAsync) {
  Kadira._wrapAsync = Meteor.wrapAsync;
} else {
  Kadira._wrapAsync = Meteor._wrapAsync;
}