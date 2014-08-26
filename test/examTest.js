var exam = require('../exam');
var is = require('../lib/is');
var pkg = require('../package');
var called = {};

require('zeriousify').test();

describe('exam', function () {

  it('runs tests', function (done) {
    done();
  });

  describe('version', function () {
    it('is a string', function () {
      is.string(exam.version);
    });
    it('matches the package version', function () {
      is(exam.version, pkg.version);
    });
  });

  describe('timeout', function () {
    this.timeout(10);

    it('cascades', function (done) {
      is(this.timeLimit, 10);
      this.timeout(20);
      is(this.timeLimit, 20);
      setTimeout(done, 15);
    });

  });

  describe('before', function () {
    before(function () {
      called.beforeSync = true;
    });
    it('works synchronously', function () {
      is.true(called.beforeSync);
    });
  });

  describe('before', function () {
    before(function (done) {
      called.beforeAsync = true;
      done();
    });
    it('works asynchronously', function () {
      is.true(called.beforeAsync);
    });
  });

  describe('after', function () {
    after(function () {
      called.afterSync = true;
    });
    it('works synchronously', function () {
      setTimeout(function () {
        is.true(called.afterSync);
      }, 9);
    });
  });

  describe('after', function () {
    afterEach(function (done) {
      called.afterSync = true;
      done();
    });
    it('works asynchronously', function () {
      setTimeout(function () {
        is.true(called.afterAsync);
      }, 9);
    });
  });

  describe('beforeEach', function () {
    beforeEach(function () {
      called.beforeEachSync = true;
    });
    it('works synchronously', function () {
      is.true(called.beforeEachSync);
    });
  });

  describe('beforeEach', function () {
    beforeEach(function (done) {
      called.beforeEachAsync = true;
      done();
    });
    it('works asynchronously', function () {
      is.true(called.beforeEachAsync);
    });
  });

  describe('afterEach', function () {
    afterEach(function () {
      called.afterEachSync = true;
    });
    it('works synchronously', function () {
      setTimeout(function () {
        is.true(called.afterEachSync);
      }, 9);
    });
  });

  describe('afterEach', function () {
    afterEach(function (done) {
      called.afterEachSync = true;
      done();
    });
    it('works asynchronously', function () {
      setTimeout(function () {
        is.true(called.afterEachAsync);
      }, 9);
    });
  });

});
