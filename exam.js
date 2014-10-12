#!/usr/bin/env node

// Exam exposes a function that runs a test suite.
global.exam = module.exports = function (options) {

  var fs = require('fs');
  var cacheDir = options.dir + '/.cache';
  var manifestPath = cacheDir + '/exam-manifest.json';
  var manifest, workers;
  var reporter = require('./lib/reporters/' + options.reporter);

  // Save the state of the current run.
  var waits, files, time;

  // Remember which paths we're watching so we don't exhaust them.
  var isWatching = {};

  // Prevent triggering a re-run when we're already running.
  var isRunning = false;

  // If forced to quit, ensure the prompt is on a new line.
  process.on('SIGINT', function () {
    console.log('\n');
    process.kill();
  });

  // Save test results that are reported by each worker.
  var outputs, passed, failed, hasOnly, skipped, stubbed;

  start();

  /**
   * Kick off a test run (or re-run).
   */
  function start() {
    waits = 0;
    files = [];
    time = new Date();
    isRunning = true;
    initResults();
    reporter.start();
    findTests();
    if (options.multiCpu) {
      readManifest();
    }
    else {
      manifest = {files: []};
    }
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
        fs.watch(dir, function () {
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
    stubbed = 0;
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
      try {
        manifest = JSON.parse(content);
      }
      catch (e) {
        manifest = {files: []};
      }
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
                if (file == '.exam.js') {
                  var config = require('./' + filePath);
                  for (var key in config) {
                    options[key] = config[key];
                  }
                }
                else if (file != '.' && file != '..' && !options.ignore.test(file)) {
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

    // In single process mode, fake a fork.
    if (!options.multiCpu) {
      cpus = [1];
      process.send = receiveResult;
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
    if (result.id == options.id) {
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
        stubbed += result.stubbed;
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
  }

  /**
   * Upon receiving results from all runners, write the report and manifest.
   */
  function finish() {
    reporter.all(outputs, passed, failed, skipped, stubbed, time);
    process.emit('exam:finished:' + options.id);
    files.sort(function (a, b) {
      return b.time - a.time;
    });
    manifest = {files: files};
    fs.mkdir(cacheDir, function (err) {
      var content = JSON.stringify(manifest, null, '  ');
      fs.writeFile(manifestPath, content, function () {
        // Allow a few milliseconds to ignore the file change.
        setTimeout(function () {
          if (!options.watch) {
            process.exit();
          }
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

// If Node loaded this file directly, run the tests.
if ((process.mainModule.filename == __filename) && !exam.options) {
  var argv = process.argv;
  var start = 2;

  var flags = [
    'help,h',
    'version,V',
    'parser,p',
    'multi-cpu,m',
    'require,r,1',
    'reporter,R,1',
    'ui,u,1',
    'grep,g,1',
    'ignore,i,1',
    'timeout,t,1',
    'slow,s,1',
    'watch,w',
    'colors,c',
    'no-colors,C',
    'growl,G',
    'debug,d',
    'bail,b',
    'async-only,A',
    'recursive',
    'debug-brk',
    'globals,1',
    'check-leaks',
    'interfaces',
    'reporters',
    'compilers'
  ];

  var map = {};
  flags.forEach(function (flag) {
    var argCount = 0;
    flag = flag.replace(/,(\d)/, function (match, count) {
      argCount = +count;
      return '';
    });
    flag = flag.split(',');
    flag.forEach(function (alias, index) {
      map[(index ? '-' : '--') + alias] = [flag[0], argCount];
    });
  });

  var options = {
    parser: 'acorn',
    reporter: 'console',
    watch: false,
    multiCpu: false,
    paths: [],
    ignore: '^$',
    dir: process.cwd(),
    id: process._EXAM_ID || 'EXAM'
  };

  for (var index = 2; index < argv.length; index++) {
    var arg = argv[index];
    var option = map[arg];
    if (option) {
      var name = option[0].replace(/-[a-z]/, function (match) {
        return match[1].toUpperCase();
      });
      options[name] = true;
      var argCount = option[1];
      while (argCount--) {
        options[name] = argv[++index];
      }
    }
    else {
      options.paths.push(arg);
    }
  }
  options.ignore = new RegExp(options.ignore);
  options.paths[0] = options.paths[0] || 'test';
  exam.options = options;
  exam(options);
}
