var fs = require('fs');

function invoke(id, args, done) {
  var examPath = require.resolve('../exam');
  var runPath = require.resolve('../lib/run');
  var argv = (process.execPath + ' ' + examPath + ' ' + args).split(' ');
  var examModule = require.cache[examPath];
  var exam = require(examPath);
  delete require.cache[examPath];
  delete require.cache[runPath];
  var write = process.stdout.write;
  mock(process, {
    mainModule: examModule,
    _EXAM_ID: id,
    _EXAM_OPTIONS: 0,
    argv: argv,
    send: 0
  });
  process.stdout.write = mock.concat();
  var event = 'exam:finished:' + id;
  process.removeAllListeners(event);
  process.on(event, function () {
    setImmediate(function () {
      unmock(process);
      process.stdout.write = write;
      process.stderr.write(process.stdout.write.value);
      done(process.stdout.write.value);
    });
  });
  require(examPath);
}

describe('Empty scenario', function () {
  it('runs with options', function (done) {
    invoke(
      'emptyTest2', '-R console -p acorn test/scenarios/emptyTest.js',
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
      'skipTest', 'test/scenarios/skipTest.js',
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
      'onlyTest', 'test/scenarios/onlyTest.js',
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
      'stubTest', 'test/scenarios/stubTest.js',
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
      'watchTest', '-w test/scenarios/empty',
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
      'errorTest', 'test/scenarios/errorTest',
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
      'parsersTest',
      'test/scenarios/parsers',
      function (output) {
        is.in(output, '2 failed');
        done();
      }
    );
  });
});
