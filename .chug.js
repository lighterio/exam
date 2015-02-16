var chug = require('chug');
var pkg = require('./package');

chug([
  'lib/_exam.js',
  'common/object/type.js',
  'common/event/emitter.js',
  'common/error/snippet-stack.js',
  'common/fs/mkdirp.js',
  'common/fs/shorten-path.js',
  'common/json/stringify.js',
  'common/json/scriptify.js',
  'common/json/colorize.js',
  'common/json/evaluate.js',
  'common/json/read-stream.js',
  'common/json/write-stream.js',
  'common/process/cli.js',
  'common/string/colors.js',
  'lib/is.js',
  'lib/mock.js',
  'lib/tree.js',
  'lib/bench.js',
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
    asset.replace('#!/usr/bin/env node', '');
    asset.replace(/\s+\/\/[^\n]+/g, '');
    asset.replace(/\/\*[\s\S]*?\*\/\s+/g, '');
    asset.replace(/var fs = require\('fs'\);\n/g, one);
    asset.replace(/module\.exports = /g, one);
    asset.replace(/delete require\.cache\[runPath\];\s+require\(runPath\)/, 'run');
    asset.replace(/require\('\.[^']*\/(tree)'\)/g, '$1');
    asset.replace(/require\([^\)]+(stringify|evaluate|scriptify|colorize|read-stream|write-stream)'\);/g, '');
    asset.replace(/var ([a-z]+)Reporter/g, 'exam.$1');
    asset.replace(/require\([^\)]+(options\.reporter)\);/g, 'exam[$1];');
    asset.replace(/var (Type|Emitter|tree|exam|mkdirp|colors|snippetStack|shortenPath|cli|runBenchmark|processCache) = require[^\n]+/g, '');
    asset.replace(/var ([a-zA-Z]+) = \n/g, '');
    asset.replace(/scope\.(is|mock) = require\('\.\/\1'\);/g, 'scope.$1 = $1;');
    asset.replace(/require\('[^\)]+\/package\.json'\)\.version/g, "'" + pkg.version + "'");
    asset.replace(/require\('[^\)]+\/options'\)/g, 'exam.options || getOptions');
    asset.replace(/\.(\.\/common\/fs\/deep-watch)/, '$1');
    asset.replace(/\n+( *)/g, function (m, s) {
      var l = Math.floor(s.length / 2);
      return '\n' + s.substr(0, l);
    });
    asset.replace(/^/, '#!/usr/bin/env node\n');
  })
  .write(__dirname, 'exam.js')
  .replace('usr/bin/env node', 'usr/bin/env iojs')
  .write(__dirname, 'exam-iojs.js');
