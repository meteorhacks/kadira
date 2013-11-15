Package.describe({
  "summery": "APM for Meteor"
});

Npm.depends({
  
});

Package.on_use(function(api) {
  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson', 'underscore'], ['server']);
  api.add_files([
    'lib/notification_manager.js',
    'lib/wrap_session.js',
    'lib/hijack_session.js',
    'lib/hijack_db.js',
    'lib/test_methods.js'
  ], 'server');
});