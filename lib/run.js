var run = {
  children: [],
  errors: [],
  waits: 1,
  file: null,
  slowTime: 20,
  slowerTime: 100,
  timeout: 2e3
};

var fns = [];
var fnIndex = 0;
var time = new Date();
var times = {};
var currentSuite = run;

// Start the test if a worker was passed a list of files.
var argv = process.argv;
var last = argv[argv.length - 1];
var arg = JSON.parse(last);
var testFiles = arg.files;
var reporter = require('./reporters/' + arg.reporter);

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
    e.trace = e.stack;
    run.errors.push(e);
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
  var next = function () {
    times[suite.file] = new Date() - time;
    var parent = suite.suite;
    if (!--parent.waits) {
      parent.done();
    }
  };
  if (suite.after) {
    tryFnInSuite(suite.after, suite, next);
  }
  else {
    next();
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

  if (error) {
    error.trace = error.stack.replace(/(\/exam\/lib\/run\.js\S+)\n[\s\S]+$/, '$1');
    if (!test.error) {
      reporter.fail();
      test.error = error;
    }
    test.results.push(error);
  }
  else {
    reporter.pass();
  }

  if (test.doneCount === 1) {
    is.setCurrentTest(null);
    test.time = new Date() - test.time;
    var suite = test.suite;
    var a = suite.afterEach;
    var next = function () {
      if (!--suite.waits) {
        suite.done();
      }
      runNextFn();
    };
    if (a) {
      tryFnInSuite(a, suite, next);
    }
    else {
      next();
    }
  }
};

function defineProperty(object, property, value) {
  if (!object[property]) {
    Object.defineProperty(object, property, {
      enumerable: false,
      value: value
    });
  }
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
  if (suite.before) {
    tryFnInSuite(suite.before, suite, function () {
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
      fn(then);
    }
    catch (e) {
      fn._EXAM_SUITE.error = e;
      then();
    }
  }
  else {
    try {
      fn();
    }
    catch (e) {
      fn._EXAM_SUITE.error = e;
    }
    then();
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
  test.time = new Date();
  is.setCurrentTest(test);
  var suite = test.suite;
  currentSuite = suite;
  var isAsync = isFnAsync(fn);
  var tryTest = function () {
    if (isAsync) {
      var timer = setTimeout(function () {
        var e = new Error('Timeout of ' + run.timeout + 'ms exceeded.');
        test.done(e);
      }, run.timeout);
      setImmediate(function () {
        try {
          fn(function () {
            clearTimeout(timer);
            test.done();
          });
        }
        catch (e) {
          test.done(e);
        }
      });
    }
    else {
      setImmediate(function () {
        try {
          fn();
          test.done();
        }
        catch (e) {
          test.done(e);
        }
      });
    }
  };
  if (suite.beforeEach) {
    tryFnInSuite(suite.beforeEach, suite, tryTest);
  }
  else {
    tryTest();
  }
}

function before(fn) {
  currentSuite.before = fn();
  defineProperty(fn, '_EXAM_SUITE', currentSuite);
}

function after(fn) {
  currentSuite.after = fn;
  defineProperty(fn, '_EXAM_SUITE', currentSuite);
}

function beforeEach(fn) {
  currentSuite.beforeEach = fn;
  defineProperty(fn, '_EXAM_SUITE', currentSuite);
}

function afterEach(fn) {
  currentSuite.afterEach = fn;
  defineProperty(fn, '_EXAM_SUITE', currentSuite);
}
