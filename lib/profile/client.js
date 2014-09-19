Kadira.profileCpu = function(timeToProfileSecs, outputLocation) {
  Meteor.call('kadira.profileCpu', timeToProfileSecs, outputLocation, function(err) {
    if(err) {
      console.log("Kadira: profiling CPU attempt failed: " + err.message);
    } else {
      console.log("Kadira: profiling has been started. check server logs");
    }
  });
};