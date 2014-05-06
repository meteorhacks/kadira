var path = Npm.require('path');
var fs = Npm.require('fs');

Package.describe({
  "summary": "Application Performance Monitoring for Meteor"
});

Npm.depends({
  "debug": "0.7.4"
});

Package.on_use(function(api) {
  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson', 'underscore', 'http', 'email', 'random'], ['server']);
  api.add_files([
    'lib/retry.js',
    'lib/utils.js',
    'lib/ntp.js',
    'lib/models/0model.js',
    'lib/models/methods.js',
    'lib/models/pubsub.js',
    'lib/apm.js',
    'lib/tracer.js',
    'lib/tracer_store.js',
    'lib/hijack/wrap_session.js',
    'lib/hijack/wrap_subscription.js',
    'lib/hijack/session.js',
    'lib/hijack/db.js',
    'lib/hijack/http.js',
    'lib/hijack/email.js',
    'lib/hijack/async.js'
  ], 'server');

  api.add_files(['lib/client/route.js'], 'client')

  if(isPackageExists('npm')) {
    api.use('npm', 'server', {weak: true});
  }

  if(isPackageExists('iron-router')) {
    api.use('iron-router', 'client', {weak: true});
  }

  if(process.env.__TEST_APM_EXPORTS) {
    //use for testing
    var exportFields = process.env.__TEST_APM_EXPORTS.split(',').map(function(v) {
      return v.trim();
    });
    api.export(exportFields);
  } else {
    api.export(['Apm']);
  }
});

Package.on_test(function(api) {
  api.use([
    'meteor-apm-client',
    'random',
    'email',
    // 'npm',
    'http',
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
  ], 'server');
});

function isPackageExists(name) {
  var fs = Npm.require('fs');
  var path = Npm.require('path');
  var meteorRootPath = meteorRoot();
  if (meteorRootPath) {
    var meteorPackages = fs.readFileSync(path.join(meteorRoot(), '.meteor', 'packages'), 'utf8');
    return !!meteorPackages.match(new RegExp(name));
  };
}

function isAppDir(filepath) {
  try {
    return fs.statSync(path.join(filepath, '.meteor', 'packages')).isFile();
  } catch (e) {
    return false;
  }
}

function meteorRoot() {
  var currentDir = process.cwd();
  while (currentDir) {
    var newDir = path.dirname(currentDir);
    if (isAppDir(currentDir)) {
      break;
    } else if (newDir === currentDir) {
      return null;
    } else {
      currentDir = newDir;
    }
  }

  return currentDir;
}