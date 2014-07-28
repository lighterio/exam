var assert = require('assert');

describe('is', function () {
  this.timeout(1e3);

  var passCount;
  var failCount;

  var reset = function () {
    mock(is, {
      _PASS: function () {
        passCount++;
      },
      _FAIL: function () {
        failCount++;
      }
    });
    passCount = failCount = 0;
  };

  it('is a function', function () {
    is.function(is);
  });

  it('.is asserts equality', function () {
    reset();
    is(1, 1);
    is('1', 1);
    is(1, true);
    is(0, false);
    assert.equal(passCount, 4);
    assert.equal(failCount, 0);
  });

  it('.not asserts inequality', function () {
    reset();
    is.not(1, 0);
    assert.equal(passCount, 1);
    assert.equal(failCount, 0);
    is.not('1', 1);
    assert.equal(failCount, 1);
  });

  it('.tis asserts strict equality', function () {
    reset();
    is.tis(1, 1);
    assert.equal(passCount, 1);
    is.tis('1', 1);
    assert.equal(failCount, 1);
  });

  it('.tisNot asserts strict inequality', function () {
    reset();
    is.tisNot(1, 1);
    assert.equal(failCount, 1);
    is.tisNot('1', 1);
    assert.equal(passCount, 1);
  });

  it('.same asserts deep equality', function () {
    reset();
    is.same({a: 1}, {a: 1});
    assert.equal(passCount, 1);
  });

  it('.notSame asserts deep inequality', function () {
    reset();
    is.notSame({a: 1}, {a: '1'});
    unmock(is);
    is(passCount, 1);
    is(failCount, 0);
  });

  describe('._FAIL', function () {
    it('throws an error', function (done) {
      unmock(is);
      try {
        is.setCurrentTest(null);
        is._FAIL();
      }
      catch (e) {
        done();
      }
    });
    it('pushes an error when "exam" is the runner', function () {
      unmock(is);
      var test = {results: []};
      is.setCurrentTest(test);
      is._FAIL();
      is(test.results.length, 1);
    });
  });

  after(function () {
    unmock(is);
  });

});
