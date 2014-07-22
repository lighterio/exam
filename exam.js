var fs = require('fs');

var exam = module.exports = function () {

  var cacheDir = process.cwd() + '/.cache';
  var manifestPath = cacheDir + '/exam-manifest.json';
  var manifest;
  var testDir = 'test';
  var workers;
  var waits = 0;
  var files = [];
  var time = new Date();
  var outputs = [''];
  var passed = 0;
  var failed = [];
  var reporter = require('./lib/reporters/console');

  reporter.start();
  readManifest();
  findTests();

  function readManifest() {
    waits++;
    fs.readFile(manifestPath, function (err, content) {
      manifest = err ? null : JSON.parse(content);
      if (!--waits) {
        assignTests();
      }
    });
  }

  function findTests() {

    function read(dir) {
      waits++;
      fs.readdir(dir, function (err, list) {
        if (err) throw err;
        list.forEach(function (file) {
          if (file != '.' && file != '..') {
            var path = dir + '/' + file;
            waits++;
            fs.stat(path, function (err, stat) {
              if (err) throw err;
              if (stat.isDirectory()) {
                read(path);
              }
              else {
                var extension = path.replace(/^.*\./, '.');
                if (require.extensions[extension] && (extension != '.json')) {
                  files.push(path);
                }
              }
              if (!--waits) {
                assignTests();
              }
            });
          }
        });
        if (!--waits) {
          assignTests();
        }
      });
    }
    read(testDir);
  }

  // TODO: Assign tests based on past runtimes from the manifest.
  function assignTests() {

    // Prepare to fork at most once per CPU, and at most once per file.
    var fork = require('child_process').fork;
    var cpus = require('os').cpus();
    var forkCount = Math.min(files.length, cpus.length);
    var forkFile = __dirname + '/lib/run.js';
    var workers = [];
    for (var i = 0; i < forkCount; i++) {
      workers[i] = [];
    }

    if (manifest) {
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
    }

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
      var arg = JSON.stringify({files: files});
      var worker = workers[index] = fork(forkFile, [arg]);
      worker.on('message', receiveResult);
    });
  }

  function receiveResult(result) {
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

  function finish() {
    reporter.all(outputs, passed, failed, time);
    process.emit('exam:finished');
    files.sort(function (a, b) {
      return b.time - a.time;
    });
    manifest = {
      files: files
    };
    fs.mkdir(cacheDir, function (err) {
      fs.writeFile(manifestPath, JSON.stringify(manifest));
    });
  }

};

exam.version = require('./package.json').version;
