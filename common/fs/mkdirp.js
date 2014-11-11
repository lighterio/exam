/**
 * Asynchronous recursive mkdir, like `mkdir -p`.
 *
 * @origin lighter-common/common/fs/mkdirp.js
 * @version 0.0.1
 */

var path = require('path');
var resolve = path.resolve;
var dirname = path.dirname;

var mkdirp = module.exports = function (path, mode, fn) {
  path = resolve(path);
  if (typeof mode == 'function') {
    fn = mode;
    mode = 493; // 0777
  }
  mk(path, mode, fn || function () {});
};

function mk(path, mode, fn, dir) {
  mkdirp.fs.mkdir(path, mode, function (error) {
    if (!error) {
      dir = dir || path;
      fn(null, dir);
    }
    else if (error.code == 'ENOENT') {
      mk(dirname(path), mode, function (error, dir) {
        if (error) {
          fn(error, dir);
        }
        else {
          mk(path, mode, fn, dir);
        }
      });
    }
    else {
      mkdirp.fs.stat(path, function (statError, stat) {
        fn((statError || !stat.isDirectory()) ? error : null, dir);
      });
    }
  });
}

// Allow a user to specify a custom file system.
mkdirp.fs = require('fs');
