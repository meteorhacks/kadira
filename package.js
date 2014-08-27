Package.describe({
  "summary": "Performance Monitoring for Meteor",
  "version": "2.5.2",
  "git": "https://github.com/meteorhacks/kadira.git",
  "name": "meteorhacks:kadira"
});

var npmModules = {
  "debug": "0.7.4"
};

if(!Package.onUse) {
  // this is not Meteor 0.9
  // we need to add usage @0.4.9 which contains platform specific builds
  // for 0.9+ we are using meteorhacks:kadira-binary-deps 
  // which has platform specific builds
  npmModules.usage = "0.4.9"
}

Npm.depends(npmModules);

Package.on_use(function(api) {
  configurePackage(api);
  api.export(['Kadira']);
});

Package.on_test(function(api) {
  configurePackage(api);
  api.use([
    'tinytest',
    'test-helpers'
  ], 'server');

  api.add_files([
    'tests/ntp.js',
    'tests/_helpers/globals.js',
    'tests/_helpers/helpers.js',
    'tests/_helpers/init.js',
    'tests/ping.js',
    'tests/hijack/info.js',
    'tests/hijack/user.js',
    'tests/hijack/email.js',
    'tests/hijack/base.js',
    'tests/hijack/async.js',
    'tests/hijack/http.js',
    'tests/hijack/db.js',
    'tests/hijack/subscriptions.js',
    'tests/models/methods.js',
    'tests/models/pubsub.js',
    'tests/models/system.js',
    'tests/tracer_store.js',
    'tests/tracer.js',
    'tests/check_for_oplog.js',
  ], 'server');
});

function configurePackage(api) {
  if(api.versionsFrom) {
    api.versionsFrom('METEOR@0.9.0');
    // binary dependencies
    api.use('meteorhacks:kadira-binary-deps@1.0.0')
  }
  
  api.use([
    'minimongo', 'livedata', 'mongo-livedata', 'ejson', 
    'underscore', 'http', 'email', 'random'
  ], ['server']);


  api.add_files([
    'lib/retry.js',
    'lib/utils.js',
    'lib/ntp.js',
    'lib/models/0model.js',
    'lib/models/methods.js',
    'lib/models/pubsub.js',
    'lib/models/system.js',
    'lib/kadira.js',
    'lib/check_for_oplog.js',
    'lib/tracer.js',
    'lib/tracer_store.js',
    'lib/hijack/wrap_session.js',
    'lib/hijack/wrap_subscription.js',
    'lib/hijack/session.js',
    'lib/hijack/db.js',
    'lib/hijack/http.js',
    'lib/hijack/email.js',
    'lib/hijack/async.js',
    'lib/auto_connect.js'
  ], 'server');

  api.add_files(['lib/client/route.js'], 'client')
}
