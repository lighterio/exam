var run = {
  children: [],
  errors: [],
  waits: 1,
  file: null,
  slowTime: 20,
  slowerTime: 100,
  timeLimit: 2e3
};

var nodes = [];
var nodeIndex = 0;
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
nextNode();

function runTestFile(file) {
  try {
    run.file = file;
    times[file] = 0;
    require(process.cwd() + '/' + file);
  }
  catch (error) {
    error.trace = getTrace(error);
    run.errors.push(error);
  }
}

function nextNode() {
  var node = nodes[nodeIndex++];
  if (!node) {
    var result = reporter.run(run);
    result.push(times);
    process.send(result);
    process.exit();
  }
  else {
    var next;
    if (node.title) {
      next = nextNode;
      currentSuite = node;
    }
    else {
      next = node.done;
      currentSuite = node.suite;
      is.setCurrentTest(node);
    }
    if (node.before) {
      tryFn(node, node.before, function () {
        tryFn(node, node.fn, next);
      });
    }
    else {
      tryFn(node, node.fn, next);
    }
  }
}

function getTrace(error) {
  return error.stack.replace(/(\/exam\/lib\/run\.js\S+)\n[\s\S]+$/, '$1');
}

function Node(fn, title, does) {
  var node = this;
  node.fn = fn;
  node.title = title;
  node.does = does;
  node.children = [];
  node.results = [];
  node.doneCount = node.waits = 0;
  node.error = node.timer = node.time = null;
  var parent = node.suite = currentSuite;
  node.before = parent.beforeEach;
  node.after = parent.afterEach;
  node.file = parent.file;
  node.timeLimit = parent.timeLimit;
  parent.children.push(node);
  parent.waits++;
  nodes.push(node);

  node.done = function (error) {
    clearTimeout(node.timer);
    var count = ++node.doneCount;
    if (count === 2) {
      error = new Error('Called "done" multiple times.');
    }
    if (error) {
      error.trace = getTrace(error);
      if (!node.error) {
        reporter.fail();
        node.error = error;
      }
      node.results.push(error);
    }
    else {
      reporter.pass();
    }
    if (count === 1) {
      var next = function () {
        is.setCurrentTest(null);
        var now = new Date();
        node.time = now - node.time;
        times[node.file] = now - time;
        var parent = node.suite;
        if (--parent.waits) {
          nextNode();
        }
        else {
          parent.done();
        }
      };
      if (node.after) {
        tryFn(node.after, node.fn, next);
      }
      else {
        next();
      }
    }
  };

  node.timeout = function (time) {
    clearTimeout(node.timer);
    node.timeLimit = time;
    if ((time > 0) && node.does) {
      node.timer = setTimeout(function () {
        var e = new Error('Timeout of ' + time + 'ms exceeded.');
        node.done(e);
      }, time);
    }
  };
}

function tryFn(node, fn, then) {
  node.time = node.time || new Date();
  var isAsync = /^function.*?\([^\s\)]/.test(fn.toString());
  if (isAsync) {
    try {
      node.timeout(node.timeLimit);
      fn.call(node, then);
    }
    catch (e) {
      node.error = e;
      then();
    }
  }
  else {
    try {
      fn.call(node);
    }
    catch (e) {
      node.error = e;
    }
    then();
  }
}

function describe(title, fn) {
  new Node(fn, title);
}

function it(does, fn) {
  new Node(fn, null, does);
}

function before(fn) {
  currentSuite.before = fn;
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
