
Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira;

if(Kadira.options && Kadira.options.endpoint) {
  Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
  Kadira.syncedDate.sync();
}
