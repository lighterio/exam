var run = {
  children: [],
  waits: 1,
  file: null,
  slowTime: 20,
  slowerTime: 100,
  timeout: 2e3
};

var fns = [];
var fnIndex = 0;
var reporter = require('./reporters/console');
var time = new Date();
var times = {};

// Start the test if a worker was passed a list of files.
var arg = JSON.parse(process.argv[process.argv.length - 1]);
var testFiles = arg.files;

global.is = require('./is');
// TODO: Make continuation configurable.
global.is.enableContinuation();
global.mock = require('./mock');
global.unmock = global.mock.unmock;
global.it = it;
global.describe = describe;
global.before = global.setup = before;
global.after = global.teardown = after;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

testFiles.forEach(runTestFile);
setImmediate(runNextFn);


function runTestFile(file) {
  try {
    run.file = file;
    times[file] = 0;
    require(process.cwd() + '/' + file);
  }
  catch (e) {
    console.error(e);
  }
}

function finish() {
  var result = reporter.run(run);
  result.push(times);
  process.send(result);
  process.exit();
}

function Suite(title, fn) {
  var suite = this;
  suite.title = title;
  suite.before = null;
  suite.after = null;
  suite.beforeEach = null;
  suite.afterEach = null;
  suite.children = [];
  suite.waits = 0;
  suite.error = null;
  var parent = suite.suite = findSuite();
  suite.file = parent.file;
  parent.children.push(suite);
  parent.waits++;
  defineProperty(fn, '_EXAM_SUITE', suite);
}

Suite.prototype.done = function () {
  var suite = this;
  if (suite.after) {
    suite.after();
  }
  times[suite.file] = new Date() - time;
  var parent = suite.suite;
  if (!--parent.waits) {
    parent.done();
  }
};

function Test(does, fn) {
  var test = this;
  test.does = does;
  test.doneCount = 0;
  test.error = null;
  test.results = [];
  var parent = test.suite = findSuite();
  parent.children.push(test);
  parent.waits++;
  defineProperty(fn, '_EXAM_TEST', test);
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
      reporter.fail();
      test.error = error;
    }
    test.results.push(error);
  }
  else {
    reporter.pass();
  }
};

function defineProperty(object, property, value) {
  Object.defineProperty(object, property, {
    enumerable: false,
    value: value
  });
}

function findSuite() {
  var name = '_EXAM_SUITE';
  var fn = arguments.callee.caller;
  while (fn.caller && !fn[name]) {
    fn = fn.caller;
    if (fn.name == 'require') {
      return run;
    }
  }
  return fn[name] || run;
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
    finish();
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
        var e = new Error('Timeout of ' + run.timeout + 'ms exceeded.');
        e.trace = e.stack;
        test.done(e);
      }, run.timeout);
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
  findSuite().after = fn;
}

function beforeEach(fn) {
  findSuite().beforeEach = fn;
}

function afterEach(fn) {
  findSuite().afterEach = fn;
}
