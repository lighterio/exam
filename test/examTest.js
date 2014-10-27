var exam = require('../exam');
var pkg = require('../package');

require('zeriousify').test();

describe('Exam', function () {

  it('runs tests', function (done) {
    done();
  });

  it('logs a line break and kills the process on SIGINT', function () {
    var code = process.listeners('SIGINT')[0].toString();
    is.in(code, '\n');
    is.in(code, 'process.kill()');
  });

  describe('version', function () {
    it('is a string', function () {
      is.string(exam.version);
    });
    it('matches the package version', function () {
      is(exam.version, pkg.version);
    });
  });

});
