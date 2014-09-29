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
  // get the job and validate it
  // var job = Jobs.get(id);
  // if(!job) {
  //   throw new Meteor.Error(403, "There is no such cpuProfile job: " + id);
  // } else if(job.state != 'created') {
  //   throw new Meteor.Error(403, "CPU profile job has been already performed!");
  // }
  // Jobs.set(id, {state: 'initiated'});

  var name = Random.id();
  var profile = getCpuProfile(name, timeToProfileSecs);
  // Jobs.set(id, {state: 'profile-taken'});
  
  //upload to S3 via HTTP
  url = 'https://us-east.manta.joyent.com/arunoda@meteorhacks.com/stor/aaa.cpuprofile?algorithm=RSA-SHA1&expires=1411998199&keyId=%2Farunoda%40meteorhacks.com%2Fkeys%2Ff0%3A4a%3A18%3A63%3A37%3A24%3Af0%3A1b%3A32%3A48%3Ac7%3A39%3A5e%3Aee%3A65%3A74&signature=mpGUl1Vji%2BtsLNpPyLAGG82%2BxEBDN5tG5EO3Slve4s2VIDy3awR2XE%2BpiWONwCyhPQ6ISyaa1milZ1EvUpesdenht8ubiUtNUFRAPVtBTAUdz8mWUNL5AcQMNiDXQF5fDEmtDgYEZHWpEKU%2FHNyTYWoKu1nAetX56zZxTGgUyyOeqnsMofT64KPrATBRx4z%2FVaSH4qJTneHtTaoWwFNdMNRrzaT3O1Mdp7tb6dB%2Bfu%2Biv%2FkfZjmciVBnLX%2BwbQuGxb2VeoQfqANf0ZJHgvdSWarCVIR%2FraLlrj1Iz0Dz6RYfrAcVgGk7fvAG4b6Z%2F1%2Bwg%2FKOQA%2F6fykIufYT03emQg%3D%3D';
  HTTP.put(url, {data: profile});
  // HTTP.post(job.data.uploadUrl, {data: profile});
  Jobs.set(id, {state: 'completed'});

  return "CPU Profile has been completed. Check Kadira Dashboard to Analyze it.";
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