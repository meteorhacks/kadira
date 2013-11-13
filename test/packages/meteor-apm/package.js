Package.describe({
  "summery": "APM for Meteor"
});

Npm.depends({

});

Package.on_use(function(api) {
  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson'], ['server']);
  api.add_files([
    'lib/namespace.js',
    'lib/wrap_session.js',
    'lib/hijack_session.js'
  ], 'server');
});