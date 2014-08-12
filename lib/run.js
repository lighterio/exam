require('./is');
require('./mock');

var run = {
  children: [],
  failed: [],
  waits: 1,
  file: null,
  slowTime: 20,
  slowerTime: 100,
  timeLimit: 2e3,
  hasOnly: false
};

var nodes = [];
var nodeIndex = 0;
var time = new Date();
var times = {};
var currentSuite = run;

global.it = it;
global.describe = describe;
global.before = global.setup = before;
global.after = global.teardown = after;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

var argv = process.argv;
var last = argv[argv.length - 1];
var arg = JSON.parse(last);
var testFiles = arg.files;
var reporter = require('./reporters/' + arg.reporter);
var parser = require(arg.parser);
var parserExp = /(^[\s|\S]+?[\/\\](esprima|acorn)\.js:\d+:\d+\))[\s\S]*$/;
var assert = require('assert');
var Module = require('module');
var fs = require('fs');
var cwd = process.cwd() + '/';
var currentPath;
var isInCwd;


// Capture the path of each module we require.
var resolve = Module._resolveFilename;
Module._resolveFilename = function () {
  var path = resolve.apply(Module, arguments);
  currentPath = path;
  isInCwd = path.indexOf(cwd) === 0 && path.substr(cwd.length, 12) != 'node_modules';
  return path;
};

// Pre-parse with Acorn or Esprima to prevent non-suppressable error logging.
Module.wrap = function (script) {
  script = Module.wrapper[0] + script + Module.wrapper[1];
  if (isInCwd) {
    parser.parse(script);
  }
  return script;
};

function runTestFile(file) {
  run.file = file;
  times[file] = 0;
  try {
    require(process.cwd() + '/' + file);
  }
  catch (e) {
    e.trace = getTrace(e).replace(parserExp, function (match, slice) {
      var pos = currentPath + ':';
      // Acorn.
      if (e.loc) {
        slice = slice.replace(/ ?\(\d+:\d+\)\n/, '\n');
        pos += e.loc.line + ':' + e.loc.column;
      }
      // Esprima.
      else {
        slice = slice.replace(/^Error: Line \d+/, 'SyntaxError');
        pos += e.lineNumber + ':' + e.column;
      }
      return slice.replace(/\n/, '\n    at parseModule (' + pos + ')\n');
    });
    reporter.fail();
    run.failed.push({title: file, errors: [e]});
  }
}

function report() {
  var result = reporter.run(run);
  result.times = times;
  process.send(result);
  process.exit();
}

function nextNode() {
  var node = nodes[nodeIndex++];
  if (!node) {
    setImmediate(report);
  }
  else {
    var next;
    if (node.title) {
      next = nextNode;
      currentSuite = node;
    }
    else {
      var parent = node.parent;
      if (node.skip || (run.hasOnly && !node.only && !parent.hasOnly)) {
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
      if (node.before) {
        tryFn(node, node.before, function () {
          tryFn(node, node.fn, next);
        });
      }
      else {
        tryFn(node, node.fn, next);
      }
    });
  }
}

function getTrace(error) {
  var trace = error.stack;
  //trace = trace.replace(/^([^\n]+)[\s\S]*?(\n +at require )/, '$1$2');
  trace = trace.replace(/(\/exam\/lib\/run\.js\S+)\n[\s\S]+?$/, '$1');
  return trace;
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
  var parent = node.parent = currentSuite;
  node.before = parent.beforeEach;
  node.after = parent.afterEach;
  node.file = parent.file;
  node.timeLimit = parent.timeLimit;
  node.only = (parent.only && !fn._EXAM_SKIP) || fn._EXAM_ONLY || false;
  node.skip = parent.skip || fn._EXAM_SKIP || false;
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
    if (error && !(error instanceof Error)) {
      console.trace(error);
    }
    clearTimeout(node.timer);
    var count = ++node.doneCount;
    if (count === 2) {
      error = new Error('Called "done()" multiple times.');
    }
    if (error) {
      error.trace = getTrace(error);
      reporter.fail();
      node.error = error;
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
        var parent = node.parent;
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
    node.timeout(node.timeLimit);
    try {
      fn.call(node, function () {
        setImmediate(then);
      });
    }
    catch (e) {
      node.error = node.error || e;
      e.trace = getTrace(e);
      setImmediate(then);
    }
  }
  else {
    try {
      fn.call(node);
    }
    catch (e) {
      node.error = node.error || e;
      e.trace = getTrace(e);
    }
    setImmediate(then);
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

testFiles.forEach(runTestFile);
nextNode();
