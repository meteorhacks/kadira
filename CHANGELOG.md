# Changelog

### v2.22.1
* Prevnt string errors crashing the app. Potential fix for: [#175](https://github.com/meteorhacks/kadira/issues/175)

### v2.22.0
* We've seen some users getting older version when installed via `meteor add meteorhacks:kadira`. We've no idea when it's happening. May be because we still support Meteor `0.9`. 
* So, this version drops Meteor `0.9` support and only support Meteor `1.0` or higher.

### v2.21.0

* Fix an issue with the time-sync logic
* Do not retry if kadira engine return a status code of range 400-500 (except 401. It throws an error.)
* Add the protocol version as 1.0.0
