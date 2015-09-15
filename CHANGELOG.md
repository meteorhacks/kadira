# Changelog

### v2.23.3
* Fix a potential issue where the possiblity to mutate authHeaders.

### v2.23.2
* Change console.error in connect code to console.log. 

### v2.23.1

* Add support for Meteor 1.2. Fixes: [#181](https://github.com/meteorhacks/kadira/issues/181). It was an issue with how we are tracking `Fiber.yield`.

### v2.23.0
* Add first steps on decoupling kadira's tracing into a seperate package.
* With this version, we allow an way to expose Kadira traces and some other metrics without connecting to Kadira.
* See example: https://gist.github.com/arunoda/8a3dec21924f08ed83b3

### v2.22.1
* Prevnt string errors crashing the app. Potential fix for: [#175](https://github.com/meteorhacks/kadira/issues/175)

### v2.22.0
* We've seen some users getting older version when installed via `meteor add meteorhacks:kadira`. We've no idea when it's happening. May be because we still support Meteor `0.9`. 
* So, this version drops Meteor `0.9` support and only support Meteor `1.0` or higher.

### v2.21.0

* Fix an issue with the time-sync logic
* Do not retry if kadira engine return a status code of range 400-500 (except 401. It throws an error.)
* Add the protocol version as 1.0.0
