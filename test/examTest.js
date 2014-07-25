var exam = require('../exam');
var is = require('../lib/is');
var pkg = require('../package');

require('zeriousify').test();

describe('exam', function () {

  describe('version', function () {
    it('is a string', function () {
      is.string(exam.version);
    });
    it('matches the package version', function () {
      is(exam.version, pkg.version);
    });
  });

});
