var called = {}

describe('tree', function () {
  describe('timeout', function () {
    this.timeout(10)

    it('cascades', function (done) {
      is(this.timeLimit, 10)
      this.timeout(20)
      is(this.timeLimit, 20)
      setTimeout(done, 15)
    })

  })

  describe('before', function () {
    before(function () {
      called.beforeSync = true
    })
    it('works synchronously', function () {
      is.true(called.beforeSync)
    })
  })

  describe('before', function () {
    before(function (done) {
      called.beforeAsync = true
      done()
    })
    it('works asynchronously', function () {
      is.true(called.beforeAsync)
    })
  })

  describe('after', function () {
    after(function () {
      called.afterSync = true
    })
    it('works synchronously', function () {
      process.on('exam:finished:EXAM', function () {
        is.true(called.afterSync)
      })
    })
  })

  describe('after', function () {
    afterEach(function (done) {
      called.afterAsync = true
      done()
    })
    it('works asynchronously', function () {
      process.on('exam:finished:EXAM', function () {
        is.true(called.afterAsync)
      })
    })
  })

  describe('beforeEach', function () {
    beforeEach(function () {
      called.beforeEachSync = true
    })
    it('works synchronously', function () {
      is.true(called.beforeEachSync)
    })
  })

  describe('beforeEach', function () {
    beforeEach(function (done) {
      called.beforeEachAsync = true
      done()
    })
    it('works asynchronously', function () {
      is.true(called.beforeEachAsync)
    })
  })

  describe('afterEach', function () {
    afterEach(function () {
      called.afterEachSync = true
    })
    it('works synchronously', function () {
      process.on('exam:finished:EXAM', function () {
        is.true(called.afterEachSync)
      })
    })
  })

  describe('afterEach', function () {
    afterEach(function (done) {
      called.afterEachAsync = true
      done()
    })
    it('works asynchronously', function () {
      process.on('exam:finished:EXAM', function () {
        is.true(called.afterEachAsync)
      })
    })
  })

})
