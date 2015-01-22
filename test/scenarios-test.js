var fs = require('fs');
var exam = require('../lib/_exam');

function invoke(options, done) {
  var write = mock.concat();
  options.stream = {write: write};
  options.reporter = options.reporter || 'console';
  options.done = function () {
    done(write.value);
  };
  exam(options);
}

xdescribe('Scenarios', function () {

  describe('Empty scenario', function () {
    it('runs with options', function (done) {
      invoke(
        {paths: ['test/scenarios/empty']},
        function (output) {
          is.in(output, '0 passed');
          done();
        }
      );
    });
  });

  describe('Skip scenario', function () {
    it('skips tests', function (done) {
      invoke(
        {paths: ['test/scenarios/skipTest.js']},
        function (output) {
          is.in(output, 'skipTest');
          is.in(output, '1 passed');
          is.in(output, '1 skipped');
          is.in(output, '1 stubbed');
          is.notIn(output, /error/i);
          done();
        }
      );
    });
  });

  describe('Only scenario', function () {
    it('only runs 2 tests', function (done) {
      invoke(
        {paths: ['test/scenarios/onlyTest.js']},
        function (output) {
          is.in(output, 'onlyTest');
          is.in(output, '2 passed');
          is.in(output, '2 skipped');
          is.notIn(output, /error/i);
          done();
        }
      );
    });
  });

  describe('Stub scenario', function () {
    it('stubs 1 test', function (done) {
      invoke(
        {paths: ['test/scenarios/stubTest.js']},
        function (output) {
          is.in(output, 'stubTest');
          is.in(output, '0 passed');
          is.in(output, '1 stubbed');
          is.notIn(output, /error/i);
          done();
        }
      );
    });
  });

  describe('Watch scenario', function () {
    it('watches files', function (done) {
      invoke(
        {paths: ['test/scenarios/empty'], watch: true},
        function (output) {
          is.in(output, '0 passed');
          done();
        }
      );
    });
  });

  describe('Error scenario', function () {
    it('throws errors', function (done) {
      invoke(
        {paths: ['test/scenarios/errorTest.js']},
        function (output) {
          is.in(output, '3 failed');
          done();
        }
      );
    });
  });

  describe('Parsers scenario', function () {
    it('uses parsers', function (done) {
      invoke(
        {paths: ['test/scenarios/parsers']},
        function (output) {
          is.in(output, '2 failed');
          done();
        }
      );
    });
  });

});
