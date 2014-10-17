Tinytest.add(
  'Ntp - ._now - with correct Date.now',
  function (test) {
    var now = Ntp._now();
    test.equal(now > 0, true);
    test.equal(typeof now, 'number');
  }
);
