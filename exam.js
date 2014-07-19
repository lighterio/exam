var fs = require('fs');
var cacheDir = '../.cache';
var manifestPath = cacheDir + '/exam-manifest.json';
var manifest;
var testDir = 'test';
var workers;
var waits = 0;
var isRunning = false;
var testFiles = [];
var tests = [];
var results = [];
var time = new Date();

var fileIndex = 0;
var fnIndex = 0;
var fns = [];

var outputs = [''];
var passed = 0;
var failed = [];

// The module exports a test runner function.
var exam = module.exports = function (options) {
  isRunning = true;
  exam.report.start();
  readManifest();
};

// Container for test suites.
exam.children = [];

// Dummy counter designed to never reach zero because "exam" isn't a Suite.
exam.waits = 1;

// Don't let tests run for more than 2 seconds.
exam.timeout = 2e3;

// Warn in yellow if tests are slower than 20 milliseconds.
exam.slowTime = 20;

// Warn in red if tests are slower than 20 milliseconds.
exam.slowerTime = 100;

exam.version = require('./package.json').version;

// Default to the console reporter.
exam.report = require('./lib/reporters/console');

// Start the test if a worker was passed a list of files.
var args = process.argv;
var last = process.argv[args.length - 1];
if (last.indexOf('exam:') === 0) {
  testFiles = last.substr(5).split('|');

  global.is = require('./lib/is');
  // TODO: Make continuation configurable.
  global.is.enableContinuation();
  global.mock = require('./lib/mock');
  global.unmock = global.mock.unmock;
  global.it = it;
  global.describe = describe;
  global.before = global.setup = before;
  global.after = global.teardown = after;
  global.beforeEach = beforeEach;
  global.afterEach = afterEach;

  testFiles.forEach(runTestFile);
  setImmediate(runNextFn);
}

function readManifest() {
  fs.readFile(manifestPath, function (err, content) {
    manifest = err ? null : JSON.parse(content);
    findTests();
  });
}

function findTests() {

  function read(dir) {
    waits++;
    fs.readdir(dir, function (err, files) {
      if (err) throw err;
      files.forEach(function (file) {
        if (file != '.' && file != '..') {
          var path = dir + '/' + file;
          waits++;
          fs.stat(path, function (err, stat) {
            if (err) throw err;
            if (stat.isDirectory()) {
              read(path);
            }
            else {
              var extension = path.replace(/^.*\./, '.');
              if (require.extensions[extension] && (extension != '.json')) {
                testFiles.push(path);
              }
            }
            if (!--waits) {
              assignTests();
            }
          });
        }
      });
      if (!--waits) {
        assignTests();
      }
    });
  }
  read(testDir);
}

// TODO: Assign tests based on past runtimes from the manifest.
function assignTests() {
  var fork = require('child_process').fork;
  var cpus = require('os').cpus();
  var forkCount = Math.min(testFiles.length, cpus.length);
  var workers = [];
  for (var i = 0; i < forkCount; i++) {
    workers[i] = [];
  }
  testFiles.forEach(function (file, index) {
    workers[index % forkCount].push(file);
  });
  waits = forkCount;
  workers.forEach(function (args, index) {
    var worker = workers[index] = fork(__filename, ['exam:' + args.join('|')]);
    worker.on('message', receiveResult);
  });
}

function receiveResult(result) {
  if (result[0]) {
    outputs.push(result[0]);
  }
  passed += result[1];
  if (typeof result[2] == 'number') {
    failed += result[2];
  }
  else {
    result[2].forEach(function (failure) {
      failed.push(failure);
    });
  }
  if (!--waits) {
    finishAll();
  }
}

function runTestFile(file) {
  try {
    require(process.cwd() + '/' + file);
  }
  catch (e) {
    console.error(e);
  }
}

function finishOneWorker() {
  isRunning = false;
  var result = exam.report.file(exam);
  process.send(result);
  process.exit();
}

function finishAll() {
  exam.report.all(outputs, passed, failed, time);
  process.exit();
}

function Suite(title, fn) {
  var suite = this;
  this.title = title;
  this.before = null;
  this.after = null;
  this.beforeEach = null;
  this.afterEach = null;
  this.children = [];
  this.waits = 0;
  this.error = null;
  var parent = this.suite = findCallerProperty('_EXAM_SUITE') || exam;
  parent.children.push(this);
  parent.waits++;
  defineProperty(fn, '_EXAM_SUITE', this);
}

Suite.prototype.done = function () {
  var suite = this;
  if (suite.after) {
    suite.after();
  }
  var parent = suite.suite;
  if (!--parent.waits) {
    parent.done();
  }
};

function Test(does, fn) {
  this.does = does;
  this.doneCount = 0;
  this.error = null;
  this.results = [];
  var parent = this.suite = findCallerProperty('_EXAM_SUITE') || exam;
  parent.children.push(this);
  parent.waits++;
  defineProperty(fn, '_EXAM_TEST', this);
  tests.push(this);
}

Test.prototype.done = function (error) {
  var test = this;
  test.doneCount++;
  if (test.doneCount === 2) {
    error = new Error('Test called "done" multiple times.');
  }
  else {
    var suite = test.suite;
    if (suite.afterEach) {
      suite.afterEach();
    }
    if (!--suite.waits) {
      suite.done();
    }
    setImmediate(runNextFn);
  }
  if (error) {
    if (!test.error) {
      exam.report.fail();
      test.error = error;
    }
    test.results.push(error);
  }
  else {
    exam.report.pass();
  }
};

function defineProperty(object, property, value) {
  Object.defineProperty(object, property, {
    value: value,
    enumerable: false
  });
}

function findCallerProperty(property) {
  var fn = arguments.callee;
  while (fn.caller && !fn[property]) {
    fn = fn.caller;
    if (fn.name == 'require') {
      return;
    }
  }
  return fn[property];
}

function describe(title, fn) {
  var suite = new Suite(title, fn);
  fns.push(fn);
}

function it(name, fn) {
  var test = new Test(name, fn);
  fns.push(fn);
}

function runNextFn() {
  var fn = fns[fnIndex++];
  if (!fn) {
    finishOneWorker();
  }
  else if (fn._EXAM_SUITE) {
    runSuite(fn);
  }
  else {
    runTest(fn);
  }
}

function runSuite(fn) {
  try {
    fn();
  }
  catch (e) {
    console.error(e);
    fn._EXAM_SUITE.error = e;
  }
  setImmediate(runNextFn);
}

function runTest(fn) {
  var test = fn._EXAM_TEST;
  var suite = test.suite;
  var code = fn.toString();
  var match = code.match();
  var isAsync;
  code.replace(/function.*?\((.*?)\)/, function (match, args) {
    isAsync = args;
  });
  try {
    if (suite.beforeEach) {
      suite.beforeEach();
    }
    if (isAsync) {
      var timer = setTimeout(function () {
        var e = new Error('Timeout of ' + exam.timeout + 'ms exceeded.');
        e.trace = e.stack;
        test.done(e);
      }, exam.timeout);
      fn(function () {
        clearTimeout(timer);
        test.done();
      });
    }
    else {
      fn();
      test.done();
    }
  }
  catch (e) {
    e.trace = e.stack;
    test.done(e);
  }
}

function before(fn) {
  fn();
}

function after(fn) {
  (findCallerProperty('_EXAM_SUITE') || exam).after = fn;
}

function beforeEach(fn) {
  (findCallerProperty('_EXAM_SUITE') || exam).beforeEach = fn;
}

function afterEach(fn) {
  (findCallerProperty('_EXAM_SUITE') || exam).afterEach = fn;
}
