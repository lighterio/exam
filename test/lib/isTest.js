var assert = require('assert');

describe('is', function () {

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

  describe('.is', function () {
    is.function(is.i);
    it('tests equality', function () {
      reset();
      is(1, 1);
      assert.equal(passCount, 1);
    });
    it('is not strict', function () {
      reset();
      is('1', 1);
      is(1, true);
      is(0, false);
      assert.equal(passCount, 3);
    });
  });

  describe('.not', function () {
    it('tests inequality', function () {
      reset();
      is.not(1, 0);
      assert.equal(passCount, 1);
    });
    it('is not strict', function () {
      reset();
      is.not('1', 1);
      assert.equal(failCount, 1);
    });
  });

  after(function () {
    unmock(is);
  });

});
