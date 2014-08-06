#!/usr/bin/env node

// Exam exposes a function that runs a test suite, by default in in [cwd]/test
var exam = module.exports = function (options) {

  var fs = require('fs');
  var cwd = process.cwd();
  var cacheDir = cwd + '/.cache';
  var manifestPath = cacheDir + '/exam-manifest.json';
  var manifest;
  var testDir = 'test';
  var workers;
  var waits = 0;
  var files = [];
  var time = new Date();
  var reporter = require('./lib/reporters/' + options.reporter);
  var ignoreFiles = {};
  var outputs, passed, failed, only, skipped;

  initResults();
  reporter.start();
  readManifest();
  findTests();

  function initResults() {
    outputs = [];
    passed = 0;
    failed = [];
    only = 0;
    skipped = 0;
  }

  function unwait() {
    if (!--waits) {
      assignTests();
    }
  }

  function handle(err) {
    if (err) {
      throw err;
    }
  }

  function readManifest() {
    waits++;
    fs.readFile(manifestPath, function (err, content) {
      manifest = JSON.parse(content || '{"files":[]}');
      unwait();
    });
  }

  function findTests() {

    function read(dir) {
      waits++;
      fs.readdir(dir, function (err, list) {
        handle(err);
        list.forEach(function (file) {
          if (file != '.' && file != '..' && !ignoreFiles[file]) {
            var path = dir + '/' + file;
            if (file == '.examignore') {
              var lines = ('' + fs.readFileSync(path)).split(/\s*[\n\r]+\s*/);
              lines.forEach(function (name) {
                ignoreFiles[name] = true;
              });
            }
            waits++;
            fs.stat(path, function (err, stat) {
              handle(err);
              if (stat.isDirectory()) {
                read(path);
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
        });
        unwait();
      });
    }
    read(testDir);
  }

  // TODO: Assign tests based on past runtimes from the manifest.
  function assignTests() {

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
    // Create a dictionary to confirm files are in the manifest.
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
   * Receive a test result array:
   *
   * Result
   *   0: Output array.
   *   1: Number of tests that passed.
   *   2: Array of outputs for failed tests.
   *   3: Map of runtimes by file path.
   *   4: Number of tests run in "only" mode.
   *   5: Number of tests skipped.
   */
  function receiveResult(result) {
    if (result[4] && !only) {
      clearResults();
      only = result[4];
    }
    if (result[0]) {
      outputs.push(result[0]);
    }
    passed += result[1];
    result[2].forEach(function (failure) {
      failed.push(failure);
    });
    var times = result[3];
    for (var file in times) {
      files.push({path: file, time: times[file]});
    }
    if (!--waits) {
      finish();
    }
  }

  /**
   * Upon receiving results from all runners, write the report and manifest.
   */
  function finish() {
    reporter.all(outputs, passed, failed, time, only, skipped);
    process.emit('exam:finished');
    files.sort(function (a, b) {
      return b.time - a.time;
    });
    manifest = {files: files};
    fs.mkdir(cacheDir, function (err) {
      fs.writeFile(manifestPath, JSON.stringify(manifest));
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
  var options = {
    parser: 'acorn',
    reporter: 'console',
    watch: false,
    singleProcess: !!process.env.running_under_istanbul
  };
  argv.forEach(function (arg, index) {
    arg = arg.toLowerCase();
    if (arg == '-r' || arg == '--reporter') {
      options.reporter = argv[index + 1];
    }
    else if (arg == '-p' || arg == '--parser') {
      options.parser = argv[index + 1];
    }
    else if (arg == '-w' || arg == '--watch') {
      options.watch = true;
    }
    else if (arg == '-s' || arg == '--single-process') {
      options.singleProcess = true;
    }
  });
  Object.defineProperty(process, '_EXAM', {
    enumerable: false,
    value: exam
  });
  process._EXAM = exam;
  exam(options);
}
