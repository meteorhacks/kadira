var v8Profiler = Npm.require('v8-profiler');
var fs = Npm.require('fs');
// var Buffer = Npm.require('buffer');

Meteor.methods({
  "kadira.profileCpu": function(arg1, arg2, type) {
    this.unblock();
    if(type == 'remote') {
      return remoteProfileCPU(arg1, arg2);
    } else {
      return localProfileCPU(arg1, arg2);
    }
  }
});

remoteProfileCPU = function(timeToProfileSecs, id) {
  // get the job and validate it
  var job = Jobs.get(id);

  if(!job) {
    throw new Meteor.Error(403, "There is no such cpuProfile job: " + id);
  } else if(job.state != 'created') {
    throw new Meteor.Error(403, "CPU profile job has been already performed!");
  }
  console.log("Kadira: CPU profiling started for %s secs", timeToProfileSecs);
  Jobs.set(id, {state: 'initiated'});

  var name = Random.id();
  var profile = getCpuProfile(name, timeToProfileSecs);
  console.log("Kadira: uploding the taken CPU profile");
  Jobs.set(id, {state: 'profile-taken'});
  
  uploadProfile(profile, job.data.uploadUrl);
  console.log("Kadira: profiling has been completed! Visit Kadira UI to analyze it.");
  Jobs.set(id, {state: 'completed'});

  return "CPU Profile has been completed. Check Kadira UI to analyze it.";
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

function uploadProfile (profile, url) {
  var content = JSON.stringify(profile);
  var headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(content)
  };
  return HTTP.put(url, {content: content, headers: headers});
}