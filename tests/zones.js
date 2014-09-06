
Tinytest.add(
  'Client Side - Error Manager - Zones - enabled by default',
  function (test) {
    var original = Zones.disable;
    var disabled = false;
    Zones.disable = function  () {
      disabled = true
    };
    try {
      Kadira.connect('aa', 'aa', {enableErrorTracking: true});
    } catch (e) {}
    test.equal(disabled, false);
    Zones.disable = original;
  }
);

Tinytest.add(
  'Client Side - Error Manager - Zones - disable with options',
  function (test) {
    var original = Zones.disable;
    var disabled = false;
    Zones.disable = function  () {
      disabled = true
    };
    try {
      Kadira.connect(null, null, {
        enableZones: false
      });
    } catch (e) {}
    test.equal(disabled, true);
    Zones.disable = original;
  }
);
