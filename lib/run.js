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
var currentSuite = run;
var currentTest = null;

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
    console.error(e.stack);
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
  var parent = suite.suite = currentSuite;
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
  var parent = test.suite = currentSuite;
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
    var after = suite.afterEach;
    var next = function () {
      if (!--suite.waits) {
        suite.done();
      }
      runNextFn();
    };
    if (after) {
      tryFnInSuite(after, suite, next);
    }
    else {
      next();
    }
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
  var suite = fn._EXAM_SUITE;
  currentSuite = suite;
  var before = suite.before;
  var after = suite.after;
  if (before) {
    tryFnInSuite(before, suite, function () {
      if (after) {
        tryFnInSuite(after, suite, function () {
          tryFnInSuite(fn, suite, runNextFn);
        });
      }
      else {
        tryFnInSuite(fn, suite, runNextFn);
      }
    });
  }
  else if (after) {
    tryFnInSuite(after, suite, function () {
      tryFnInSuite(fn, suite, runNextFn);
    });
  }
  else {
    tryFnInSuite(fn, suite, runNextFn);
  }
}

function tryFnInSuite(fn, suite, then) {
  if (isFnAsync(fn)) {
    try {
      fn(function () {
        setImmediate(then);
      });
    }
    catch (e) {
      console.error(e.stack);
      fn._EXAM_SUITE.error = e;
      setImmediate(then);
    }
  }
  else {
    try {
      fn();
    }
    catch (e) {
      console.error(e.stack);
      fn._EXAM_SUITE.error = e;
    }
    setImmediate(then);
  }
}

function isFnAsync(fn) {
  var code = fn.toString();
  var match = code.match();
  var isAsync = false;
  code.replace(/function.*?\((.*?)\)/, function (match, args) {
    isAsync = args ? true : false;
  });
  return isAsync;
}

function runTest(fn) {
  var test = fn._EXAM_TEST;
  is._EXAM_TEST = test;
  var suite = test.suite;
  currentSuite = suite;
  var isAsync = isFnAsync(fn);
  var before = suite.beforeEach;
  var tryTest = function () {
    try {
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
  };
  if (before) {
    tryFnInSuite(before, suite, tryTest);
  }
  else {
    tryTest();
  }
}

function before(fn) {
  currentSuite.before = fn();
}

function after(fn) {
  currentSuite.after = fn;
}

function beforeEach(fn) {
  currentSuite.beforeEach = fn;
}

function afterEach(fn) {
  currentSuite.afterEach = fn;
}
