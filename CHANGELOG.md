# Changelog

### v2.21.0

* Fix an issue with the time-sync logic
* Do not retry if kadira engine return a status code of range 400-500 (except 401. It throws an error.)
* Add the protocol version as 1.0.0
