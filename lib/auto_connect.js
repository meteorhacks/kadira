Kadira._connectWithEnv = function() {
  if(process.env.APM_APP_ID && process.env.APM_APP_SECRET && process.env.APM_OPTIONS_ENDPOINT) {
    var options = Kadira._parseEnv(process.env);

    Kadira.connect(
      process.env.APM_APP_ID,
      process.env.APM_APP_SECRET,
      options
    );

    Kadira.connect = function() {
      throw new Error('Meteor APM has already connected using credentials from Environment Variables');
    };
  }
  // other forms of Kadira.connect are not supported
};

// Try to connect automatically
Kadira._connectWithEnv();
