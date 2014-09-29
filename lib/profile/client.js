Kadira.profileCpu = function(timeToProfileSecs, outputLocation) {
  console.log("Kadira: profiling has been started. check server logs");
  Meteor.call('kadira.profileCpu', timeToProfileSecs, outputLocation, function(err, res) {
    if(err) {
      console.error("Kadira: profiling CPU attempt failed: " + err.message);
    } else {
      console.log("Kadira: " + res);
    }
  });
};