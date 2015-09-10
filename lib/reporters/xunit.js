var time
var replacements = {
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;'
}
var esc = function (text) {
  return text.replace(/[<&>"]/g, function (match) {
    return replacements[match]
  })
}

var xunitReporter = module.exports = {

  start: function () {
    time = new Date()
  },

  finishTree: function (run, data) {
    var dive = function (node) {
      if (node.name) {
        var error = node.error
        var shouldShow = error || !node.children
        if (shouldShow) {
          data[error ? 'failed' : 'passed']++
          var name
          var suite = node.parent
          while (suite && suite.name) {
            name = suite.name + (name ? ' ' + name : '')
            suite = suite.parent
          }
          var common = 'classname="' + esc(name) + '" ' +
            'name="' + esc(node.name) + '" ' +
            'time="' + (node.time / 1e3) + '"'
          data.output += '<testcase ' + common
          if (error) {
            var message = error.replace(/\n[\S\s]+/, '')
            data.output += ' message="' + esc(message) + '">' +
              '<failure ' + common + ' ' +
                'message="' + esc(message) + '">' +
                '<![CDATA[' + esc(error) + ']]>' +
                '</failure></testcase>\n'
          } else {
            data.output += '/>\n'
          }
        }
      }
      if (node.children) {
        node.children.forEach(dive)
      }
    }
    dive(run)
    return data
  },

  finishExam: function (data) {
    var stream = this.stream
    stream.write(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<testsuite name="Exam" ' +
        'tests="' + (data.passed + data.failed) + '" ' +
        'failures="' + data.failed + '" ' +
        // TODO: Report individual errors.
        'errors="' + data.failed + '" ' +
        'skipped="0" ' +
        'timestamp="' + (new Date()).toUTCString() + '" ' +
        'time="' + (data.time / 1e3) + '">\n')
    stream.write(data.outputs.join(''))
    stream.write('</testsuite>\n')
  }

}
