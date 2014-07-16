// remove
var endpoint = 'http://localhost:11011';
// remove

Kadira = {};

Kadira.syncedDate = new Ntp(endpoint);
Kadira.syncedDate.sync();
