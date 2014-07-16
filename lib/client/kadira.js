
Kadira = {};

Kadira.options = __meteor_runtime_config__.kadira;

Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
Kadira.syncedDate.sync();
