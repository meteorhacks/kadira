var v8Profiler = Npm.require('v8-profiler');
var fs = Npm.require('fs');

Meteor.methods({
  "kadira.profileCpu": function(timeToProfileSecs, outputLocation) {
    var name = Random.id();
    v8Profiler.startProfiling(name);
    if(!outputLocation) {
      outputLocation = '/tmp/' + name + '.cpuprofile';
    }
    console.log('Kadira: started profiling for %s secs', timeToProfileSecs);
    setTimeout(function() {
      var profile = v8Profiler.stopProfiling(name);
      console.log('Kadira: saving CPU profile to: ' + outputLocation);
      fs.writeFile(outputLocation, JSON.stringify(profile), afterWritten);
    }, timeToProfileSecs * 1000);

    function afterWritten(err) {
      if(err) {
        console.error('Kadira: error taking cpu profile: ', err.message);
      } else {
        console.log('Kadira: CPU profile saved.');
      }
    }
  }
});