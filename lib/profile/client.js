Kadira.profileCpu = function(arg1, arg2, type) {
  console.log("Kadira: profiling has been started. check server logs");
  Meteor.call('kadira.profileCpu', arg1, arg2, type, function(err, res) {
    if(err) {
      console.error("Kadira: profiling CPU attempt failed: " + err.message);
    } else {
      console.log("Kadira: " + res);
    }
  });
};