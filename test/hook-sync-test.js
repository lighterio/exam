'use strict'

describe('hook test', function () {
  var CHILD = 'child'
  var PARENT = 'parent'
  var BEFORE = 'before'
  var BEFORE_EACH = 'beforeEach'
  var AFTER = 'after'
  var AFTER_EACH = 'afterEach'

  describe('before', function () {
    var befores = []

    before(function () {
      befores.push(PARENT + BEFORE)
    })

    it('should have BEFORE', function () {
      is.same(befores, [PARENT + BEFORE])
    })

    it('should only have BEFORE', function () {
      is.same(befores, [PARENT + BEFORE])
    })

    describe('child', function () {
      it('should still only have BEFORE', function () {
        is.same(befores, [PARENT + BEFORE])
      })
    })

    describe('nested before', function () {
      before(function () {
        befores.push(CHILD + BEFORE)
      })

      it('should have two BEFORE', function () {
        is.same(befores, [PARENT + BEFORE, CHILD + BEFORE])
      })
    })
  })

  describe('beforeEach', function () {
    var beforeEachs = []

    beforeEach(function () {
      beforeEachs.push(PARENT + BEFORE_EACH)
    })

    it('should have BEFORE_EACH', function () {
      is.same(beforeEachs, [PARENT + BEFORE_EACH])
    })

    it('should have two BEFORE', function () {
      is.same(beforeEachs, [PARENT + BEFORE_EACH, PARENT + BEFORE_EACH])
    })

    describe('child', function () {
      it('should have three BEFORE', function () {
        is.same(beforeEachs, [PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, PARENT + BEFORE_EACH])
      })
    })

    describe('nested beforeEach', function () {
      beforeEach(function () {
        beforeEachs.push(CHILD + BEFORE_EACH)
      })

      it('should have five BEFORE', function () {
        is.same(beforeEachs, [PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, PARENT + BEFORE_EACH, CHILD + BEFORE_EACH])
      })
    })
  })

  describe('after', function () {
    var afters = []

    describe('wrapper', function () {
      after(function () {
        afters.push(PARENT + AFTER)
      })

      it('is empty case', function () {})

      it('is another empty case', function () {})

    })

    it('should only have one AFTER', function () {
      is.same(afters, [PARENT + AFTER])
    })

    describe('nested after', function () {
      after(function () {
        afters.push(CHILD + AFTER)
      })

      it('is a nested empty case', function () {})
    })

    it('should have two AFTER', function () {
      is.same(afters, [PARENT + AFTER, CHILD + AFTER])
    })
  })

  describe('afterEach', function () {
    var afterEachs = []

    describe('wrapper', function () {
      afterEach(function () {
        afterEachs.push(PARENT + AFTER_EACH)
      })

      it('is empty case', function () {})

      it('is another empty case', function () {})

    })

    it('should have two AFTER', function () {
      is.same(afterEachs, [PARENT + AFTER_EACH, PARENT + AFTER_EACH])
    })

    describe('nested after', function () {
      afterEach(function () {
        afterEachs.push(CHILD + AFTER_EACH)
      })

      it('is a nested empty case', function () {})
    })

    it('should have three AFTER', function () {
      is.same(afterEachs, [PARENT + AFTER_EACH, PARENT + AFTER_EACH, CHILD + AFTER_EACH])
    })
  })
})
