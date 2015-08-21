var exam = require('../exam')
var pkg = require('../package')

describe('Exam', function () {

  it('runs tests', function (done) {
    done()
  })

  it('logs a line break and kills the process on SIGINT', function (done) {
    mock(process, {
      exit: function () {
        unmock()
        done()
      }
    })
    mock(process.stdout, {
      write: mock.concat()
    })
    process.emit('SIGINT')
  })

  describe('version', function () {
    it('is a string', function () {
      is.string(exam.version)
    })
    it('matches the package version', function () {
      is(exam.version, pkg.version)
    })
  })

})
