/**
 * Return a colorized stack trace with code snippets.
 *
 * @origin lighter-common/common/error/snippet-stack.js
 * @version 0.0.1
 * @import string/colors
 * @import fs/shorten-path
 */
var fs = require('fs');
var colors = require('../string/colors');
var shortenPath = require('../fs/shorten-path');

var snippetStack = module.exports = function (stack, options) {
  var arrow = (process.platform == 'win32' ? '\u2192' : '\u279C') + ' ';
  options = options || 0;
  var lead = options.lead || 5;
  var trail = options.trail || lead / 2;
  var decay = options.decay || 0.5;
  var indent = options.indent || '  ';
  var color = options.color || 'red';
  var ignore = options.ignore || 0;
  stack = stack.replace(
    /\n +at ([^:\n]+ )?(\(|)(\/[^:]+\/)([^\/:]+):(\d+):(\d+)(\)?)/g,
    function (match, name, start, path, file, line, column, end) {
      if (ignore && ignore.test(path)) {
        return match;
      }
      var shortPath = shortenPath(path);
      var message = '\n' + indent +
        colors.gray + 'at ' +
        (name ? colors.base + name + colors.gray : '') + '(' +
        colors.cyan + shortPath +
        colors.yellow + file + colors.gray + ':' +
        colors.base + line + colors.gray + ':' +
        colors.green + column + colors.gray + ')';
      if (lead >= 1) {
        var lineNumber = line * 1; // 1-indexed.
        var lines = '';
        try {
          lines += fs.readFileSync(path + file);
        }
        catch (e) {
          // If we can't find a file, we show a line without a snippet.
        }
        lines = lines.split('\n');
        start = Math.max(1, Math.round(lineNumber - lead));
        end = Math.min(lines.length, lineNumber + Math.round(trail));
        var numberLength = ('' + end).length;
        for (i = start; i <= end; i++) {
          line = lines[i - 1];
          var blockIndent = indent + '     ';
          var pipe = '| ';
          if (i == lineNumber) {
            column--;
            line = line.substr(0, column) + line.substr(column).replace(/(;?$)/, '$1'.gray).green;
            blockIndent = indent + '   ' + arrow[color];
            pipe = pipe.gray;
          }
          var n = '' + i;
          n = Array(numberLength - n.length + 1).join(' ') + n;
          message += '\n' + blockIndent + n + pipe + line.replace('\t', '  ') + colors.gray;
        }
        lead *= decay;
        trail *= decay;
      }
      return message;
    }
  );
  stack = stack.replace(/(\n +at )(\S+ )?/g, '\n' + indent + 'at ' + colors.base + '$2' + colors.gray);
  return colors[color] + stack;
};
