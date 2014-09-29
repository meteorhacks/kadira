var v8Profiler = Npm.require('v8-profiler');
var fs = Npm.require('fs');

Meteor.methods({
  "kadira.profileCpu": function(arg1, arg2, type) {
    if(type == 'remote') {
      return remoteProfileCPU(arg1, arg2);
    } else {
      return localProfileCPU(arg1, arg2);
    }
  }
});

remoteProfileCPU = function(timeToProfileSecs, id) {
  // get the job and validated
  // update state - initiated
  // do the cpu profile
  // update state - profile-taken
  // upload it to the s3 with curl
  // update state - completed
  // delete the cpu profile
};

localProfileCPU = function(timeToProfileSecs, outputLocation) {
  if(!process.env.KADIRA_PROFILE_LOCALLY) {
    throw new Meteor.Error(403, "run your app with `KADIRA_PROFILE_LOCALLY` env vairable to profile locally.")
  }

  var name = Random.id();
  if(!outputLocation) {
    outputLocation = '/tmp/' + name + '.cpuprofile';
  }
  console.log('Kadira: started profiling for %s secs', timeToProfileSecs);
  var profile = getCpuProfile(name, timeToProfileSecs);

  console.log('Kadira: saving CPU profile to: ' + outputLocation);
  writeToDisk(outputLocation, JSON.stringify(profile));
  console.log('Kadira: CPU profile saved.');

  return "cpu profile has been saved to: " + outputLocation;
};

getCpuProfile = Kadira._wrapAsync(function(name, timeToProfileSecs, callback) {
  v8Profiler.startProfiling(name);
  setTimeout(function() {
    var profile = v8Profiler.stopProfiling(name);
    callback(null, profile);
  }, timeToProfileSecs * 1000);
});

writeToDisk = Kadira._wrapAsync(fs.writeFile);