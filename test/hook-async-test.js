'use strict'

describe('hook test', function () {
  var CHILD = 'child'
  var PARENT = 'parent'
  var BEFORE = 'before'
  var BEFORE_EACH = 'beforeEach'
  var AFTER = 'after'
  var AFTER_EACH = 'afterEach'
  var nextTick = process.nextTick

  describe('before', function () {
    var befores = []

    before(function (done) {
      nextTick(function () {
        befores.push(PARENT + BEFORE)
        done()
      })
    })

    it('should have BEFORE', function (done) {
      is.same(befores, [PARENT + BEFORE])
      nextTick(done)
    })

    it('should only have BEFORE', function (done) {
      is.same(befores, [PARENT + BEFORE])
      nextTick(done)
    })

    describe('child', function () {
      it('should still only have BEFORE', function (done) {
        is.same(befores, [PARENT + BEFORE])
        nextTick(done)
      })
    })

    describe('nested before', function () {
      before(function (done) {
        nextTick(function () {
          befores.push(CHILD + BEFORE)
          done()
        })
      })

      it('should have two BEFORE', function (done) {
        is.same(befores, [PARENT + BEFORE, CHILD + BEFORE])
        nextTick(done)
      })
    })
  })

  describe('beforeEach', function () {
    var beforeEachs = []

    beforeEach(function (done) {
      nextTick(function () {
        beforeEachs.push(PARENT + BEFORE_EACH)
        done()
      })
    })

    it('should have BEFORE_EACH', function (done) {
      is.same(beforeEachs, [PARENT + BEFORE_EACH])
      nextTick(done)
    })

    it('should have two BEFORE', function (done) {
      is.same(beforeEachs, [PARENT + BEFORE_EACH, PARENT + BEFORE_EACH])
      nextTick(done)
    })

    describe('child', function () {
      it('should have three BEFORE', function (done) {
        is.same(beforeEachs, [PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, PARENT + BEFORE_EACH])
        nextTick(done)
      })
    })

    describe('nested beforeEach', function () {
      beforeEach(function (done) {
        nextTick(function () {
          beforeEachs.push(CHILD + BEFORE_EACH)
          done()
        })
      })

      it('should have five BEFORE', function (done) {
        is.same(beforeEachs, [PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, CHILD + BEFORE_EACH])
        nextTick(done)
      })
    })
  })

  describe('after', function () {
    var afters = []

    describe('wrapper', function () {
      after(function (done) {
        nextTick(function () {
          afters.push(PARENT + AFTER)
          done()
        })
      })

      it('is empty case', function (done) {
        nextTick(done)
      })

      it('is another empty case', function (done) {
        nextTick(done)
      })
    })

    it('should only have one AFTER', function (done) {
      is.same(afters, [PARENT + AFTER])
      nextTick(done)
    })

    describe('nested after', function () {
      after(function (done) {
        nextTick(function () {
          afters.push(CHILD + AFTER)
          done()
        })
      })

      it('is a nested empty case', function (done) {
        nextTick(done)
      })
    })

    it('should have two AFTER', function (done) {
      is.same(afters, [PARENT + AFTER, CHILD + AFTER])
      nextTick(done)
    })
  })

  describe('afterEach', function () {
    var afterEachs = []

    describe('wrapper', function () {
      afterEach(function (done) {
        nextTick(function () {
          afterEachs.push(PARENT + AFTER_EACH)
          done()
        })
      })

      it('is empty case', function (done) {
        nextTick(done)
      })

      it('is another empty case', function (done) {
        nextTick(done)
      })
    })

    it('should have two AFTER', function (done) {
      is.same(afterEachs, [PARENT + AFTER_EACH, PARENT + AFTER_EACH])
      nextTick(done)
    })

    describe('nested after', function () {
      afterEach(function (done) {
        nextTick(function () {
          afterEachs.push(CHILD + AFTER_EACH)
          done()
        })
      })

      it('is a nested empty case', function (done) {
        nextTick(done)
      })
    })

    it('should have three AFTER', function (done) {
      is.same(afterEachs, [PARENT + AFTER_EACH, PARENT + AFTER_EACH, CHILD + AFTER_EACH])
      nextTick(done)
    })
  })
})
