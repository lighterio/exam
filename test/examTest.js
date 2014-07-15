var assert = require('assert-plus');
var exam = require('../exam');
var is = require('../lib/is');

var pkg = require('../package');

describe('API', function () {
  it('is the correct version', function () {
    is(exam.version, 1);
    assert.equal(exam.version, 2);
    is(exam.version, pkg.version);
  });
  it('exposes blah', function () {
    is.defined(exam.blah);
  });
});
