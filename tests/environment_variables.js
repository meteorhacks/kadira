Tinytest.add(
  'AutoConnect - connect with environment variables',
  function (test) {
    var originalEnv = process.env;
    var originalConnect = Kadira.connect;

    process.env = {
      APM_APP_ID: 'rcZSEaSgMaxH4c2df',
      APM_APP_SECRET: '9af3daf3-64f3-4448-8b1e-4286fdf5f499',
      APM_OPTIONS_CLIENT_ENGINE_SYNC_DELAY: '123',
      APM_OPTIONS_ERROR_DUMP_INTERVAL: '234',
      APM_OPTIONS_MAX_ERRORS_PER_INTERVAL: '345',
      APM_OPTIONS_COLLECT_ALL_STACKS: 'true',
      APM_OPTIONS_ENABLE_ERROR_TRACKING: 'false',
      APM_OPTIONS_ENDPOINT: 'https://engine.kadira.io',
      APM_OPTIONS_HOSTNAME: 'my-hostname',
      APM_OPTIONS_PAYLOAD_TIMEOUT: '456',
      APM_OPTIONS_PROXY: 'http://localhost:3128',
    };

    var connectArgs;
    Kadira.connect = function () {
      connectArgs = Array.prototype.slice.call(arguments);
    }

    Kadira._connectWithEnv();

    test.equal(connectArgs[0], 'rcZSEaSgMaxH4c2df');
    test.equal(connectArgs[1], '9af3daf3-64f3-4448-8b1e-4286fdf5f499');
    test.equal(connectArgs[2], {
      clientEngineSyncDelay: 123,
      errorDumpInterval: 234,
      maxErrorsPerInterval: 345,
      collectAllStacks: true,
      enableErrorTracking: false,
      endpoint: 'https://engine.kadira.io',
      hostname: 'my-hostname',
      payloadTimeout: 456,
      proxy: 'http://localhost:3128',
    });

    process.env = originalEnv;
    Kadira.connect = originalConnect;
  }
);
