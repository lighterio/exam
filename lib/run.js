/**
 * Set up options based on a JSON argument.
 */
var argv = process.argv;
var options = JSON.parse(argv.pop());
var testFiles = options.files;
var reporter = require('./reporters/' + options.reporter);
var parser = require(options.parser);
var parserExp = /(^[\s|\S]+?[\/\\](esprima|acorn)\.js:\d+:\d+\))[\s\S]*$/;

/**
 * Reference `setTimeout` and `clearTimeout` directly in case they get mocked.
 */
var timers = require('timers');
var setTimeout = timers.setTimeout;
var clearTimeout = timers.clearTimeout;

/**
 * Nodes are suites and tests, which run sequentially starting from zero.
 */
var nodes = [];
var nodeIndex = 0;

/**
 * The test `run` is the root of all nodes.
 */
var run = {
  children: [],
  failed: [],
  waits: 1,
  file: null,
  slowTime: options.slow,
  verySlowTime: options.verySlow,
  timeLimit: options.timeout,
  hasOnly: false,
  time: new Date()
};

/**
 * The `run` is the default "suite".
 */
var currentSuite = run;

/**
 * Keep track of how long each file takes to run.
 */
var fileTimes = {};

/**
 * Override `Module` methods to preempt `SyntaxError` logging.
 */
var Module = require('module');
var cwd = process.cwd() + '/';
var currentPath;
var isInCwd;
var alreadyParsed = !!process.env.running_under_istanbul;
var resolve = Module._resolveFilename;

// Capture the path of each module we require.
Module._resolveFilename = function () {
  var path = resolve.apply(Module, arguments);
  currentPath = path;
  isInCwd = path.indexOf(cwd) === 0 && path.substr(cwd.length, 12) != 'node_modules';
  return path;
};

// Pre-parse with Acorn or Esprima to prevent non-suppressable error logging.
Module.wrap = function (script) {
  if (isInCwd && !alreadyParsed) {
    parser.parse(script);
  }
  script = Module.wrapper[0] + script + Module.wrapper[1];
  return script;
};

// Assign uncaught exceptions to the current test or suite.
process.on('uncaughtException', function (error) {
  console.log('uncaught');
  var node = (is.currentTest || currentSuite);
  if (node && node.done) {
    node.done(error);
  }
  else {
    console.log(error);
    process.exit();
  }
});

/**
 * Run a file which we expect to contain `describe` and `it` calls.
 */
function runTestFile(file) {
  run.file = file;
  fileTimes[file] = 0;
  try {
    require(cwd + file);
  }
  catch (e) {
    prepareError(e);
    reporter.fail();
    run.failed.push({title: file, errors: [e]});
  }
}

function nextNode() {
  var node = nodes[nodeIndex++];
  if (node) {
    var next;
    if (node.title) {
      next = nextNode;
      currentSuite = node;
    }
    else {
      var parent = node.parent;
      if (node.skip || (run.hasOnly && !node.only)) {
        reporter.skip();
        setImmediate(nextNode);
        return;
      }
      else {
        next = node.done;
        currentSuite = parent;
        is.setCurrentTest(node);
      }
    }
    setImmediate(function () {
      var before = node.before;
      var runFn = function () {
        tryFn(node, node.fn, function () {
          var newBefore = node.before;
          if (newBefore != before) {
            tryFn(node, newBefore, next);
          }
          else {
            next();
          }
        });
      };
      if (before) {
        tryFn(node, before, runFn);
      }
      else {
        runFn();
      }
    });
  }
  else {
    setImmediate(report);
  }
}

function prepareError(e) {
  e.trace = (e.stack || e.message).replace(parserExp, function (match, slice) {
    var pos = currentPath + ':';
    // Acorn.
    if (e.loc) {
      slice = slice.replace(/ ?\(\d+:\d+\)\n/, '\n');
      pos += e.loc.line + ':' + (e.loc.column + 1);
    }
    // Esprima.
    else {
      slice = slice.replace(/^Error: Line \d+/, 'SyntaxError');
      pos += e.lineNumber + ':' + e.column;
    }
    return slice.replace(/\n/, '\n    at parseModule (' + pos + ')\n');
  });

  // If we must bail on the first error, skip all remaining nodes.
  if (options.bail) {
    var node;
    while (node = nodes[nodeIndex++]) {
      node.skip = true;
    }
  }
}

function stub() {
  reporter.stub();
}

function Node(fn, title, name) {
  var node = this;
  fn = fn || stub;
  node.fn = fn;
  node.title = title;
  node.name = name;
  node.doneCount = node.waits = 0;
  var parent = node.parent = currentSuite;
  node.before = parent.beforeEach;
  node.after = parent.afterEach;
  node.file = parent.file;
  node.timeLimit = parent.timeLimit;
  node.only = (parent.only && !fn._EXAM_SKIP) || fn._EXAM_ONLY || false;
  node.skip = parent.skip || fn._EXAM_SKIP || false;
  node.stub = (fn == stub);
  node.results = [];
  node.children = [];
  node.error = node.timer = node.time = null;
  parent.children.push(node);
  parent.waits++;
  nodes.push(node);

  if (node.only) {
    while (parent && !parent.hasOnly) {
      parent.hasOnly = true;
      parent = parent.parent;
    }
  }

  node.done = function (error) {
    clearTimeout(node.timer);
    var count = ++node.doneCount;
    if (count > 1) {
      error = new Error('Called "done()" multiple times.');
    }
    if (error instanceof Error) {
      prepareError(error);
      reporter.fail();
      node.error = error;
      node.results.push(error);
    }
    else {
      reporter.pass();
    }
    if (count === 1) {
      var next = function () {
        var now = new Date();
        node.time = now - node.time;
        fileTimes[node.file] = now - run.time;
        var parent = node.parent;
        if (--parent.waits) {
          if (parent.after) {
            tryFn(parent, parent.after, nextNode);
          }
          else {
            nextNode();
          }
        }
        else {
          parent.done();
        }
      };
      var after = node.after;
      if (after) {
        tryFn(node, after, next);
      }
      else {
        next();
      }
    }
  };

  node.timeout = function (time, done) {
    clearTimeout(node.timer);
    node.timeLimit = time;
    if ((time > 0) && node.name) {
      node.timer = setTimeout(function () {
        var e = new Error('Timeout of ' + time + 'ms exceeded.');
        done(e);
      }, time);
    }
  };
}

function tryFn(node, fn, then) {
  node.time = node.time || new Date();
  var isAsync = /^function.*?\([^\s\)]/.test(fn.toString());
  if (isAsync) {
    var done = fn._EXAM_TEST ? node.done : then;
    node.timeout(node.timeLimit, done);
    try {
      fn.call(node, function () {
        clearTimeout(node.timer);
        setImmediate(then);
      });
    }
    catch (e) {
      clearTimeout(node.timer);
      prepareError(e);
      if (!node.error) {
        node.error = e;
        reporter.fail();
      }
      setImmediate(then);
    }
  }
  else {
    try {
      fn.call(node);
    }
    catch (e) {
      if (!node.error) {
        node.error = e;
        reporter.fail();
      }
      prepareError(e);
    }
    setImmediate(then);
  }
}

/**
 * Create a test suite.
 */
global.describe = function (title, fn) {
  new Node(fn, title || 'suite');
}

/**
 * Create a test.
 */
global.it = function (name, fn) {
  var node = new Node(fn, null, name || 'test');
  node.fn._EXAM_TEST = true;
}

/**
 * Set a function to be run before each test suite.
 */
global.before = global.setup = function (fn) {
  currentSuite.before = prepareFunction(arguments, 'before');
}

/**
 * Set a function to be run after each test suite.
 */
global.after = global.teardown = function (fn) {
  currentSuite.after = prepareFunction(arguments, 'after');
}

/**
 * Set a function to be run before each test.
 */
global.beforeEach = function (fn) {
  currentSuite.beforeEach = prepareFunction(arguments, 'beforeEach');
}

/**
 * Set a function to be run after each test.
 */
global.afterEach = function (fn) {
  currentSuite.afterEach = prepareFunction(arguments, 'afterEach');
}

/**
 * Be robust against people mistakenly applying names to `before`/`after`/etc.
 */
function prepareFunction(args, name) {
  var fn = (typeof args[1] == 'function') ? args[1] : args[0];
  fn.name = (typeof args[0] == 'string') ? args[0] : name;
  return fn;
}

/**
 * Create `only` and `skip` methods for `it` and `describe`.
 */
[describe, it].forEach(function (me) {
  me.only = function (text, fn) {
    fn._EXAM_ONLY = true;
    me(text, fn);
  };
  me.skip = function (text, fn) {
    fn._EXAM_SKIP = true;
    me(text, fn);
  };
});

/**
 * Make Exam's built-in assertions and mocks globally available.
 */
global.is = require('./is');
global.mock = require('./mock');

/**
 * Start the run by running all of the assigned test files.
 */
testFiles.forEach(runTestFile);

/**
 * Kick off the recursive process of executing each suite and test.
 */
nextNode();

/**
 * After all suites and tests, send results up to the master CPU.
 */
function report() {
  var result = reporter.run(run);
  result.id = options.id;
  result.times = fileTimes;
  try {
    process.send(result);
  }
  catch (e) {
    console.log(e);
    console.log(result);
  }
}
