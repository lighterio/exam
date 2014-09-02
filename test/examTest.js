var exam = require('../exam');
var pkg = require('../package');

require('zeriousify').test();

describe('exam', function () {

  it('runs tests', function (done) {
    done();
  });

  it('logs a line break on SIGINT', function (done) {
    mock(process, {kill: mock.count()});
    mock(console, {log: mock.concat()});
    process.emit('SIGINT');
    setImmediate(function () {
      unmock(process);
      unmock(console);
      done();
    });
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
