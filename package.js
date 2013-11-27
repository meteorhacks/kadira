Package.describe({
  "summery": "APM for Meteor"
});

Npm.depends({
  
});

Package.on_use(function(api) {
  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson', 'underscore', 'http'], ['server']);
  api.add_files([
    'lib/models/methods.js',
    'lib/apm.js',
    'lib/notification_manager.js',
    'lib/hijack/wrap_session.js',
    'lib/hijack/session.js',
    'lib/hijack/db.js',
    'lib/hijack/http.js',
    'lib/hijack/async.js'
  ], 'server');
  
  api.export('Apm');
});
