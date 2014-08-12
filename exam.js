#!/usr/bin/env node

var cwd = process.cwd();

// Exam exposes a function that runs a test suite.
var exam = module.exports = function (options) {

  var fs = require('fs');
  var cacheDir = cwd + '/.cache';
  var manifestPath = cacheDir + '/exam-manifest.json';
  var manifest, workers;
  var reporter = require('./lib/reporters/' + options.reporter);

  // Save the state of the current run.
  var waits, files, time, ignoreFiles;

  // Remember which paths we're watching so we don't exhaust them.
  var isWatching = {};

  // Prevent triggering a re-run when we're already running.
  var isRunning = false;

  // Save test results that are reported by each worker.
  var outputs, passed, failed, hasOnly, skipped;

  start();

  /**
   * Kick off a test run (or re-run).
   */
  function start() {
    waits = 0;
    files = [];
    time = new Date();
    ignoreFiles = {};
    isRunning = true;
    initResults();
    reporter.start();
    readManifest();
    findTests();
    if (options.watch) {
      watch();
    }
  }

  /**
   * Recurse directories and watch for changes.
   * Upon any change, re-run tests.
   */
  function watch() {
    var ignoreFiles = {
      '.cache': true,
      '.git': true,
      'coverage': true,
      'node_modules': true
    };
    function read(dir) {
      if (!isWatching[dir]) {
        isWatching[dir] = true;

        console.log('WATCHING', dir);
        fs.watch(dir, function () {
          console.log('CHANGED', arguments);
          if (!isRunning) {
            start();
          }
        });
      }
      fs.readdir(dir, function (err, list) {
        if (err) {
          handle(err);
        }
        else {
          list.forEach(function (file) {
            var path = dir + '/' + file;
            if (file != '.' && file != '..' && !ignoreFiles[file]) {
              fs.stat(path, function (err, stat) {
                if (err) {
                  handle(err);
                }
                else if (stat.isDirectory()) {
                  read(path);
                }
              });
            }
          });
        }
      });
    }
    read(options.dir);
  }

  /**
   * Initialize (or re-initialize) the result set.
   */
  function initResults() {
    outputs = [];
    passed = 0;
    failed = [];
    hasOnly = false;
    skipped = 0;
    isRunning = true;
  }

  /**
   * Decrement the count of async events we're waiting for.
   */
  function unwait() {
    if (!--waits) {
      assignTests();
    }
  }

  /**
   * Read the manifest file (if possible), and ignore errors.
   */
  function readManifest() {
    waits++;
    fs.readFile(manifestPath, function (err, content) {
      manifest = JSON.parse(content || '{"files":[]}');
      unwait();
    });
  }

  /**
   * Handle an error by adding it to failures rather than exiting.
   */
  function handle(error) {
    error.trace = error.stack;
    failed.push({title: 'Exam', errors: [error]});
  }

  /**
   * Read or recurse the file path or directory that was specified (or default).
   */
  function findTests() {
    function read(path) {
      waits++;
      fs.stat(path, function (err, stat) {
        if (err) {
          // TODO: Support .coffee and other extensions.
          if (!/\.js$/.test(path)) {
            read(path + '.js');
          }
          else {
            handle(err);
          }
        }
        else if (stat.isDirectory()) {
          waits++;
          fs.readdir(path, function (err, list) {
            if (err) {
              handle(err);
            }
            else {
              list.forEach(function (file) {
                var filePath = path + '/' + file;
                if (file == '.examignore') {
                  var content = '' + fs.readFileSync(filePath);
                  var lines = content.split(/\s*[\n\r]+\s*/);
                  lines.forEach(function (name) {
                    ignoreFiles[name] = true;
                  });
                }
                else if (file != '.' && file != '..' && !ignoreFiles[file]) {
                  read(filePath);
                }
              });
            }
            unwait();
          });
        }
        else {
          var extension = path.replace(/^.*\./, '.');
          if (require.extensions[extension] && (extension != '.json')) {
            files.push(path);
          }
        }
        unwait();
      });
    }
    options.paths.forEach(read);
  }

  /**
   * If there are test files, assign them to cores for running.
   */
  function assignTests() {

    if (!files.length) {
      finish();
      return;
    }

    var fork = require('child_process').fork;
    var cpus = require('os').cpus();

    // If exam is being run by istanbul, forking would prevent increments.
    if (options.singleProcess) {
      manifest.files.pop();
      process.send = receiveResult;
      cpus = [1];
      fork = function (path, args) {
        process.argv.push(args[0]);
        require(path);
        return {on: function () {}};
      };
    }

    // Prepare to fork at most once per CPU, and at most once per file.
    var forkCount = Math.min(files.length, cpus.length);
    var forkFile = __dirname + '/lib/run.js';
    var workers = [];
    for (var i = 0; i < forkCount; i++) {
      workers[i] = [];
    }

    // Create a dictionary of files found this time.
    var found = {};
    files.forEach(function (path) {
      found[path] = true;
    });

    // Create a dictionary of files that are in the manifest.
    var manifested = {};

    // The manifest is sorted by largest to smallest runtime.
    var sorted = [];
    manifest.files.forEach(function (file) {
      var path = file.path;
      if (found[path]) {
        manifested[path] = true;
        sorted.push(path);
      }
    });

    // Push any new files onto the end (as if they ran instantly last time).
    files.forEach(function (path) {
      if (!manifested[path]) {
        sorted.push(path);
      }
    });
    files = sorted;

    // Zig-zag over the list of files so that the slowest and fastest will hit
    // the same core in the case where there are 2 passes.
    // TODO: Assign more optimally by summing runtimes and juggling buckets.
    var reverse = true;
    files.forEach(function (path, index) {
      var mod = index % forkCount;
      if (!mod) reverse = !reverse;
      index = reverse ? forkCount - 1 - mod : mod;
      workers[index].push(path);
    });
    waits = forkCount;
    files = [];
    workers.forEach(function (files, index) {
      options.files = files;
      var arg = JSON.stringify(options);
      var worker = workers[index] = fork(forkFile, [arg]);
      worker.on('message', receiveResult);
    });
  }

  /**
   * Receive test results from a forked process.
   */
  function receiveResult(result) {
    skipped += result.skipped;

    // If another process put us in "only" mode, count this one as skipped.
    if (hasOnly && !result.hasOnly) {
      skipped += result.passed + result.failed.length;
    }
    else {
      // If entering only mode, add all previous counts to "skipped".
      if (result.hasOnly && !hasOnly) {
        var total = passed + failed.length + skipped;
        initResults();
        hasOnly = true;
        skipped = total;
      }
      if (result.output) {
        outputs.push(result.output);
      }
      passed += result.passed;
      result.failed.forEach(function (failure) {
        failed.push(failure);
      });
      var times = result.times;
      for (var file in times) {
        files.push({path: file, time: times[file]});
      }
    }
    if (!--waits) {
      finish();
    }
  }

  /**
   * Upon receiving results from all runners, write the report and manifest.
   */
  function finish() {
    reporter.all(outputs, passed, failed, skipped, time);
    process.emit('exam:finished');
    files.sort(function (a, b) {
      return b.time - a.time;
    });
    manifest = {files: files};
    fs.mkdir(cacheDir, function (err) {
      var content = JSON.stringify(manifest, null, '  ');
      fs.writeFile(manifestPath, content, function () {
        // Allow a few milliseconds to ignore the file change.
        setTimeout(function () {
          isRunning = false;
        }, 99);
      });
    });
  }

};

// Expose the version number, but only load package JSON if it's requested.
Object.defineProperty(exam, 'version', {
  get: function () {
    return require('./package.json').version;
  }
});

// If node loaded this file directly, run the tests.
if ((process.mainModule.filename == __filename) && !process._EXAM) {
  var argv = process.argv;
  var start = 2;
  var options = {
    parser: 'acorn',
    reporter: 'console',
    watch: false,
    singleProcess: !!process.env.running_under_istanbul,
    paths: [],
    dir: cwd
  };
  argv.forEach(function (arg, index) {
    if (index >= start) {
      var key = arg.toLowerCase();
      if (key == '-r' || key == '--reporter') {
        options.reporter = argv[index + 1];
        argv[index + 1] = null;
      }
      else if (key == '-p' || key == '--parser') {
        options.parser = argv[index + 1];
        argv[index + 1] = null;
      }
      else if (key == '-d' || key == '--dir') {
        options.dir = argv[index + 1];
        argv[index + 1] = null;
      }
      else if (key == '-w' || key == '--watch') {
        options.watch = true;
      }
      else if (key == '-s' || key == '--single-process') {
        options.singleProcess = true;
      }
      else if (arg) {
        options.paths.push(arg);
      }
    }
  });
  options.paths[0] = options.paths[0] || 'test';

  Object.defineProperty(process, '_EXAM', {
    enumerable: false,
    value: exam
  });
  process._EXAM = exam;
  exam(options);
}
