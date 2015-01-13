// AutoConnect using Environment Variables
if(process.env.KADIRA_APP_ID && process.env.KADIRA_APP_SECRET) {
  var options = getOptionsFromEnvironment();

  Kadira.connect(
    process.env.KADIRA_APP_ID,
    process.env.KADIRA_APP_SECRET,
    options
  );

  Kadira.connect = function() {
    throw new Error('Kadira has been already connected using credentials from Environment Variables');
  };
}

// AutoConnect using Meteor.settings
if(
  Meteor.settings.kadira &&
  Meteor.settings.kadira.appId &&
  Meteor.settings.kadira.appSecret
) {
  Kadira.connect(
    Meteor.settings.kadira.appId,
    Meteor.settings.kadira.appSecret,
    Meteor.settings.kadira.options || {}
  );

  Kadira.connect = function() {
    throw new Error('Kadira has been already connected using credentials from Meteor.settings');
  };
}

// get options from environment variables
function getOptionsFromEnvironment () {
  var env = process.env;

  // default options
  var options = {};

  if(env.KADIRA_OPTIONS_CLIENT_ENGINE_SYNC_DELAY) {
    checkNum('KADIRA_OPTIONS_CLIENT_ENGINE_SYNC_DELAY');
    var value = parseInt(env.KADIRA_OPTIONS_CLIENT_ENGINE_SYNC_DELAY);
    options.clientEngineSyncDelay = value;
  }

  if(env.KADIRA_OPTIONS_ERROR_DUMP_INTERVAL) {
    checkNum('KADIRA_OPTIONS_ERROR_DUMP_INTERVAL');
    var value = parseInt(env.KADIRA_OPTIONS_ERROR_DUMP_INTERVAL);
    options.errorDumpInterval = value;
  }

  if(env.KADIRA_OPTIONS_MAX_ERRORS_PER_INTERVAL) {
    checkNum('KADIRA_OPTIONS_MAX_ERRORS_PER_INTERVAL');
    var value = parseInt(env.KADIRA_OPTIONS_MAX_ERRORS_PER_INTERVAL);
    options.maxErrorsPerInterval = value;
  }

  if(env.KADIRA_OPTIONS_COLLECT_ALL_STACKS) {
    var isEnabled = isTrue(env.KADIRA_OPTIONS_COLLECT_ALL_STACKS);
    options.collectAllStacks = isEnabled;
  }

  if(env.KADIRA_OPTIONS_ENABLE_ERROR_TRACKING) {
    var isEnabled = isTrue(env.KADIRA_OPTIONS_ENABLE_ERROR_TRACKING);
    options.enableErrorTracking = isEnabled;
  }

  if(env.KADIRA_OPTIONS_ENDPOINT) {
    options.endpoint = env.KADIRA_OPTIONS_ENDPOINT;
  }

  if(env.KADIRA_OPTIONS_HOSTNAME) {
    options.hostname = env.KADIRA_OPTIONS_HOSTNAME;
  }

  if(env.KADIRA_OPTIONS_PAYLOAD_TIMEOUT) {
    checkNum('KADIRA_OPTIONS_PAYLOAD_TIMEOUT');
    var value = parseInt(env.KADIRA_OPTIONS_PAYLOAD_TIMEOUT);
    options.payloadTimeout = value;
  }

  if(env.KADIRA_OPTIONS_PROXY) {
    options.proxy = env.KADIRA_OPTIONS_PROXY;
  }

  // finally, return the options object
  return options;

  function isNumeric (str) {
    var num = parseInt(str);
    return num || num === 0;
  }

  function isTrue (str) {
    return str.toLowerCase() === 'true';
  }

  function checkNum (name) {
    if(!isNumeric(env[name])) {
      throw new Error('Kadira: '+name+' env. variable should be numeric');
    }
  }
}
