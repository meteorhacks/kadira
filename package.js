var path = Npm.require('path');
var fs = Npm.require('fs');

Package.describe({
  "summary": "Performance Monitoring for Meteor"
});

Npm.depends({
  "debug": "0.7.4",
  "nodefly-uvmon": "0.0.7"
});

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
    'tests/_helpers/globals.js',
    'tests/_helpers/helpers.js',
    'tests/_helpers/init.js',
    'tests/ping.js',
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
    'tests/tracer.js'
  ], 'server');
});

function configurePackage(api) {
  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson', 'underscore', 'http', 'email', 'random'], ['server']);
  api.add_files([
    'lib/retry.js',
    'lib/utils.js',
    'lib/ntp.js',
    'lib/models/0model.js',
    'lib/models/methods.js',
    'lib/models/pubsub.js',
    'lib/models/system.js',
    'lib/kadira.js',
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
