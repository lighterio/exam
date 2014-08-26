var assert = require('assert');

describe('is', function () {
  this.timeout(1e3);

  var passCount;
  var failCount;

  beforeEach(function () {
    mock(is, {
      pass: function () {
        passCount++;
      },
      fail: function () {
        failCount++;
      }
    });
    passCount = 0;
    failCount = 0;
  });

  it('is a function', function () {
    is.function(is);
  });

  it('.is asserts strict equality', function () {
    is(1, 1);
    assert.equal(passCount, 1);
    is.is('1', 1);
    assert.equal(failCount, 1);
  });

  it('.not asserts strict inequality', function () {
    is.not(1, 1);
    assert.equal(failCount, 1);
    is.not('1', 1);
    assert.equal(passCount, 1);
  });

  it('.equal asserts equality', function () {
    is.equal(1, 1);
    is.equal('1', 1);
    is.equal(1, true);
    is.equal(0, false);
    assert.equal(passCount, 4);
    assert.equal(failCount, 0);
  });

  it('.notEqual asserts inequality', function () {
    is.notEqual(1, 0);
    assert.equal(passCount, 1);
    assert.equal(failCount, 0);
    is.notEqual('1', 1);
    assert.equal(failCount, 1);
  });

  it('.same asserts deep equality', function () {
    is.same({a: 1}, {a: 1});
    assert.equal(passCount, 1);
    is.deepEqual(1, 1);
    assert.equal(passCount, 2);
    is.not({a: 1}, {a: 1});
    assert.equal(passCount, 3);
  });

  it('.notSame asserts deep inequality', function () {
    is.notSame({a: 1}, {a: '1'});
    assert.equal(passCount, 1);
  });

  it('.truthy asserts a value evaluates to true', function () {
    is.truthy(1);
    assert.equal(passCount, 1);
    is.truthy(true);
    assert.equal(passCount, 2);
    is.truthy('hello');
    assert.equal(passCount, 3);
    is.truthy([]);
    assert.equal(passCount, 4);
    is.truthy({});
    assert.equal(passCount, 5);
    is.truthy(0);
    assert.equal(failCount, 1);
    is.truthy(false);
    assert.equal(failCount, 2);
    is.truthy('');
    assert.equal(failCount, 3);
    is.truthy({}.undefined);
    assert.equal(failCount, 4);
  });

  it('.falsy asserts a value evaluates to true', function () {
    is.falsy(0);
    assert.equal(passCount, 1);
    is.falsy(false);
    assert.equal(passCount, 2);
    is.falsy('');
    assert.equal(passCount, 3);
    is.falsy({}.undefined);
    assert.equal(passCount, 4);
    is.falsy(1);
    assert.equal(failCount, 1);
    is.falsy(true);
    assert.equal(failCount, 2);
    is.falsy('boom');
    assert.equal(failCount, 3);
    is.falsy([]);
    assert.equal(failCount, 4);
    is.falsy({});
    assert.equal(failCount, 5);
  });

  describe('.fail', function () {
    it('throws an error', function (done) {
      unmock(is);
      try {
        is.setCurrentTest(null);
        is.fail();
      }
      catch (e) {
        done();
      }
    });
    it('pushes an error when "exam" is the runner', function () {
      unmock(is);
      var test = {results: []};
      is.setCurrentTest(test);
      is.fail();
      is(test.results.length, 1);
    });
  });

  afterEach(function () {
    unmock(is);
  });

  after(function () {
    unmock(is);
  });

});
