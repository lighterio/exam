var fs = require('fs');
var cluster = require('cluster');
var exec = require('child_process').exec;
var cacheDir = '../.cache';
var manifestPath = cacheDir + '/exam-manifest.json';
var manifest;
var testDir = 'test';
var isMaster = cluster.isMaster;
var cpus = isMaster ? require('os').cpus() : null;
var workerId = isMaster ? 0 : cluster.worker.id;
var workers;
var cwd = process.cwd() + '/';
var waits = 0;
var log = console.log;
var isRunning = false;
var testFiles = [];
var tests = [];
var results = [];
var time;

var fileIndex = 0;
var fnIndex = 0;
var fns = [];

var outputs = [''];
var passed = 0;
var failed = [];

// The module exports a test runner function.
var exam = module.exports = function (options) {
  isRunning = true;
  if (isMaster) {
    exam.report.start();
    fork();
    readManifest();
  }
  else {
    work();
  }
};

// Container for test suites.
exam.children = [];

// Don't let tests run for more than 2 seconds.
exam.timeout = 2e3;

// Warn in yellow if tests are slower than 20 milliseconds.
exam.slowTime = 20;

// Warn in red if tests are slower than 20 milliseconds.
exam.slowerTime = 100;

exam.version = require('./package.json').version;

// Default to the console reporter.
exam.report = require('./lib/reporters/console');

function readManifest() {
  fs.readFile(manifestPath, function (err, content) {
    manifest = err ? null : JSON.parse(content);
    findTests();
  });
}

// TODO: Make this work on Windows.
function findTests() {
  var command = exec('find ' + testDir, function (err, output) {
    if (err) throw err;
    var paths = output.split(/\n/);
    paths.forEach(function (path) {
      var extension = path.replace(/^.*\./, '.');
      if (require.extensions[extension] && (extension != '.json')) {
        testFiles.push(path);
      }
    });
    assignTests();
  });
}

function fork() {
  workers = [];
  cpus.forEach(function () {
    var worker = cluster.fork();
    worker.files = [];
    workers.push(worker);
    // When we receive a message from a worker, add it to the test results.
    worker.on('message', function (result) {
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
    });
  });
}

// TODO: Assign tests based on past runtimes from the manifest.
function assignTests() {
  testFiles.forEach(function (file, index) {
    var worker = workers[index % cpus.length];
    worker.files.push(file);
  });
  time = new Date();
  workers.forEach(function (worker) {
    var files = worker.files;
    if (files.length) {
      ++waits;
      worker.send(files);
    }
  });
}

function work() {
  process.on('message', function (files) {
    files.forEach(runTestFile);
    runNextFn();
  });
}

function runTestFile(file) {
  try {
    require(cwd + file);
  }
  catch (e) {
    console.error(e);
  }
}

function finishOneWorker() {
  isRunning = false;
  var result = exam.report.file(exam);
  process.send(result);
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
  this.error = null;
  this.parent = findCallerProperty('_EXAM_SUITE') || exam;
  this.parent.children.push(this);
  defineProperty(fn, '_EXAM_SUITE', this);
}

function Test(does, fn) {
  this.does = does;
  this.doneCount = 0;
  this.error = null;
  this.results = [];
  this.time = null;
  this.suite = findCallerProperty('_EXAM_SUITE');
  this.suite.children.push(this);
  defineProperty(fn, '_EXAM_TEST', this);
  tests.push(this);
}

Test.prototype.done = function (error) {
  var test = this;
  test.doneCount++;
  if (error) {
    exam.report.fail();
    test.results.push(error);
  }
  if (test.doneCount > 1) {
    exam.report.fail();
    test.results.push(new Error('Test called "done" multiple times.'));
  }
  else {
    exam.report.pass();
    test.time = new Date() - test.time;
    if (test.suite.afterEach) {
      test.suite.afterEach();
    }
    runNextFn();
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
    fn._EXAM_SUITE.error = e;
  }
  runNextFn();
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
    test.time = new Date();
    if (isAsync) {
      var timer = setTimeout(function () {
        var error = new Error('Test timed out');
        test.done(error);
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
  var suite = findCallerProperty('_EXAM_SUITE');
  if (suite) {
    suite.after = fn;
  }
}

function beforeEach(fn) {
  var suite = findCallerProperty('_EXAM_SUITE');
  if (suite) {
    suite.beforeEach = fn;
  }
}

function afterEach(fn) {
  var suite = findCallerProperty('_EXAM_SUITE');
  if (suite) {
    suite.afterEach = fn;
  }
}

if (!isMaster) {
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
}
