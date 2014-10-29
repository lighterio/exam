var chug = require('chug');
var pkg = require('./package');

chug([
  'lib/exam.js',
  'lib/common/emitter.js',
  'lib/common/mkdirp.js',
  'lib/common/stringify.js',
  'lib/is.js',
  'lib/mock.js',
  'lib/options.js',
  'lib/tree.js',
  'lib/reporters/console.js',
  'lib/reporters/counts.js',
  'lib/reporters/tap.js',
  'lib/reporters/xunit.js'
])
  .concat()
  .each(function (asset) {
    function one(match) {
      return one[match] ? '' : one[match] = match;
    }
    asset.replace(/\s+\/\/[^\n]+/g, '');
    asset.replace(/\/\*[\s\S]*?\*\/\s+/g, '');
    asset.replace(/var fs = require\('fs'\);\n/g, one);
    asset.replace(/module\.exports = /g, one);
    asset.replace(/delete require\.cache\[runPath\];\s+require\(runPath\)/, 'run');
    asset.replace(/require\('\.[^']*\/(tree|stringify)'\)/g, '$1');
    asset.replace(/var ([a-z]+)Reporter/g, 'exam.$1');
    asset.replace(/require\([^\)]+(options\.reporter)\);/g, 'exam[$1];');
    asset.replace(/var (Emitter|tree|mkdirp) = require[^\n]+/g, '');
    asset.replace(/global\.(is|mock) = require\('\.\/\1'\);/g, '');
    asset.replace(/require\('[^\)]+\/package\.json'\)\.version/g, "'" + pkg.version + "'");
    asset.replace(/require\('[^\)]+\/options'\)/g, 'exam.options || getOptions');
    asset.replace(/\n+( *)/g, function (m, s) {
      var l = Math.floor(s.length / 2);
      return '\n' + s.substr(0, l);
    });
  })
  .write(__dirname, 'exam.js');
