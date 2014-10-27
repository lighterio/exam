var path = require('path');

var mkdirp = module.exports = function (p, m, f) {
  p = path.resolve(p);
  if (typeof m == 'function') {
    f = m;
    m = 493; // 0777
  }
  mk(p, m, f || function () {});
};

mkdirp.fs = require('fs');

function mk(p, m, f, d) {
  mkdirp.fs.mkdir(p, m, function (e) {
    if (!e) {
      d = d || p;
      f(null, d);
    }
    else if (e.code == 'ENOENT') {
      mkdirp(path.dirname(p), m, function (e, d) {
        if (e) {
          f(e, d);
        }
        else {
          mkdirp(p, m, f, d);
        }
      });
    }
    else {
      mkdirp.fs.stat(p, function (e2, stat) {
        f((e2 || !stat.isDirectory()) ? e : null, d);
      });
    }
  });
}
