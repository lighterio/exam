var fs = require('fs')
var log = console.log
var contents = []
var n = 0

function dive (dir, depth) {
  depth = depth || 1
  n++
  fs.readdir(dir, function (err, files) {
    if (!err) {
      files.forEach(function (file) {
        var path = dir + '/' + file
        n++
        fs.stat(path, function (err, stat) {
          if (!err) {
            if (stat.isDirectory()) {
              if (depth < 7) {
                dive(path, depth + 1)
              }
            } else if (/\.js$/.test(file)) {
              n++
              fs.readFile(path, function (err, content) {
                if (!err) contents.push('' + content)
                if (!--n) done()
              })
            }
          }
          if (!--n) done()
        })
      })
    }
    if (!--n) done()
  })
}

dive('../')

function done () {
  var parsers = {
    acorn: require('acorn'),
    esprima: require('esprima'),
    eval: {
      parse: function (s) { eval('f=function(){' + s + '}')}
    }
  }
  for (var name in parsers) {
    var parser = parsers[name]
    var start = Date.now()
    contents.forEach(function (content) {
      try {
        parser.parse(content)
      } catch (e) {
      }
    })
    var elapsed = Date.now() - start
    log(name + ': ' + elapsed + 'ms')
  }
}
