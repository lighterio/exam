'use strict'
/* global describe it xit beforeEach is mock unmock */
var assert = require('assert')

describe('is', function () {
  this.timeout(1e3)

  var ok

  function pass () {
    assert.strictEqual(ok, true, 'Expected a pass.')
  }

  function fail () {
    assert.strictEqual(ok, false, 'Expected a failure.')
  }

  beforeEach(function () {
    mock(is, {
      pass: function () { ok = true },
      fail: function () { ok = false }
    })
    ok = undefined
  })

  it('is a function', function () {
    is.function(is)
  })

  xit('.fail throws an error', function (done) {
    unmock(is)
    try {
      is.fail(['something', 'is not', 'working'], is.fail, 'something', 'working', 'is not')
    } catch (e) {
      is(e.message, 'something is not working')
      done()
    }
  })

  it('.fail emits an error when `is` is an emitter', function (done) {
    unmock(is)
    mock(is, {emit: function (event, result) {
      assert.strictEqual(event, 'result')
      assert(result instanceof Error)
      done()
    }})
    is.fail()
  })

  xit('.stringify works in all cases', function () {
    unmock(is)
    is(is.stringify({n: null}), '{n:null}')
    // Try classes and max depth (stuff that's not in other tests).
    function Thing () {
      this.what = 'what?'
    }
    Thing.prototype.hi = function () {
      alert(this.what)
    }
    var thing = new Thing()
    var hi = Thing.prototype.hi.toString()
    is(is.stringify(Thing), Thing.toString())
    is(is.stringify(thing), '{what:\"what?\",hi:' + Thing.prototype.hi.toString() + '}')
    is(is.stringify({for:1}), '{for:1}')
    is(is.stringify([[[[[[[[[[[1]]]]]]]]]]]), '[[[[[[[[[[[1]]]]]]]]]]]')
    is(is.stringify([[[[[[[[[[[{}]]]]]]]]]]]), '[[[[[[[[[[[{}]]]]]]]]]]]')
  })

  it('.is asserts strict equality', function () {
    var a = {}
    var b = {}
    is(1, 1); pass()
    is(a, a); pass()
    is(a, b); fail()
    is.is('1', 1); fail()
  })

  it('.not asserts strict inequality', function () {
    var a = {}
    var b = {}
    is.not('1', 1); pass()
    is.not(a, b); pass()
    is.not(a, a); fail()
    is.not(1, 1); fail()
  })

  it('.equal asserts equality', function () {
    is.equal(1, 1); pass()
    is.equal('1', 1); pass()
    is.equal(1, true); pass()
    is.equal(0, false); pass()
    is.equal(0, true); fail()
    is.equal('a', 1); fail()
  })

  it('.notEqual asserts inequality', function () {
    is.notEqual(1, 0); pass()
    is.notEqual('1', 1); fail()
  })

  it('.same asserts deep equality', function () {
    var n = 0
    is(is.same, is.deepEqual); pass()
    is.same(null, null); pass()
    is.same(undefined, undefined); pass()
    is.same(true, true); pass()
    is.same(false, false); pass()
    is.same(1e9, 1e9); pass()
    is.same(0.1, 0.1); pass()
    is.same('', ''); pass()
    is.same('a', 'a'); pass()
    var x = {a: 1}
    var y = {a: 1}
    is.same(x, x); pass()
    is.same(x, y); pass()
    is.same(NaN, NaN); pass()
    is.same([], []); pass()
    is.same([1, 2], [1, 2]); pass()
    is.same(new Date(1e12), new Date(1e12)); pass()
    var c = {}
    var d = {}
    c.c = c
    c.o = {d: d}
    d.c = d
    d.o = {d: c}
    is.same(c, d); pass()
    is.same(function a () { hello() }, function a () { hello() }); pass()
    is.same(1, 2); fail()
  })

  xit('.notSame asserts deep inequality', function () {
    is.notSame({a: 1}, {a: '1'}); pass()
    is.notSame('a', 'b'); pass()
    is.notSame({a: 1, b: 2}, {b: 1, a: 2}); pass()
    is.notSame('a', 'a'); fail()
  })

  it('.greater asserts one value is greater than another', function () {
    is.greater(2, 1); pass()
    is.greater('z', 'a'); pass()
    is.greater(1, 1); fail()
    is.greater(1, 2); fail()
  })

  it('.less asserts one value is else than another', function () {
    is.less(1, 2); pass()
    is.less('a', 'z'); pass()
    is.less(1, 1); fail()
    is.less(2, 1); fail()
  })

  it('.greater asserts one value is greater than or equal to another', function () {
    is.greaterOrEqual(2, 1); pass()
    is.greaterOrEqual('z', 'a'); pass()
    is.greaterOrEqual(1, 1); pass()
    is.greaterOrEqual(1, 2); fail()
  })

  it('.lessOrEqual asserts one value is less than or equal to another', function () {
    is.lessOrEqual(1, 2); pass()
    is.lessOrEqual('a', 'z'); pass()
    is.lessOrEqual(1, 1); pass()
    is.lessOrEqual(2, 1); fail()
  })

  var u
  var n = null
  var t = true
  var f = false
  var i = 0
  var s = ''
  var F = function () {}
  var o = {}
  var a = []
  var d = new Date()
  var e = new Error()
  var r = /a/

  it('.type asserts a value is of a given type', function () {
    is.type(u, 'undefined'); pass()
    is.type(n, 'object'); pass()
    is.type(t, 'boolean'); pass()
    is.type(f, 'boolean'); pass()
    is.type(i, 'number'); pass()
    is.type(s, 'string'); pass()
    is.type(F, 'function'); pass()
    is.type(o, 'object'); pass()
    is.type(a, 'object'); pass()
    is.type(d, 'object'); pass()
    is.type(e, 'object'); pass()
    is.type(u, 'defined'); fail()
  })

  it('.notType asserts a value is not of a given type', function () {
    is.notType(u, 'undefined'); fail()
    is.notType(n, 'object'); fail()
    is.notType(t, 'boolean'); fail()
    is.notType(f, 'boolean'); fail()
    is.notType(i, 'number'); fail()
    is.notType(s, 'string'); fail()
    is.notType(F, 'function'); fail()
    is.notType(o, 'object'); fail()
    is.notType(a, 'object'); fail()
    is.notType(d, 'object'); fail()
    is.notType(e, 'object'); fail()
    is.notType(u, 'defined'); pass()
  })

  it('.undefined asserts a value is undefined', function () {
    is.undefined(u); pass()
    is.undefined(n); fail()
    is.undefined(t); fail()
    is.undefined(f); fail()
    is.undefined(i); fail()
    is.undefined(s); fail()
    is.undefined(F); fail()
    is.undefined(o); fail()
    is.undefined(a); fail()
    is.undefined(d); fail()
    is.undefined(e); fail()
  })

  it('.defined asserts a value is defined', function () {
    is.defined(u); fail()
    is.defined(n); pass()
    is.defined(t); pass()
    is.defined(f); pass()
    is.defined(i); pass()
    is.defined(s); pass()
    is.defined(F); pass()
    is.defined(o); pass()
    is.defined(a); pass()
    is.defined(d); pass()
    is.defined(e); pass()
    is(is.notUndefined, is.defined); pass()
  })

  it('.boolean asserts a value is a boolean', function () {
    is.boolean(u); fail()
    is.boolean(n); fail()
    is.boolean(t); pass()
    is.boolean(f); pass()
    is.boolean(i); fail()
    is.boolean(s); fail()
    is.boolean(F); fail()
    is.boolean(o); fail()
    is.boolean(a); fail()
    is.boolean(d); fail()
    is.boolean(e); fail()
  })

  it('.notBoolean asserts a value is not a boolean', function () {
    is.notBoolean(u); pass()
    is.notBoolean(n); pass()
    is.notBoolean(t); fail()
    is.notBoolean(f); fail()
    is.notBoolean(i); pass()
    is.notBoolean(s); pass()
    is.notBoolean(F); pass()
    is.notBoolean(o); pass()
    is.notBoolean(a); pass()
    is.notBoolean(d); pass()
    is.notBoolean(e); pass()
  })

  it('.number asserts a value is a number', function () {
    is.number(u); fail()
    is.number(n); fail()
    is.number(t); fail()
    is.number(f); fail()
    is.number(i); pass()
    is.number(s); fail()
    is.number(F); fail()
    is.number(o); fail()
    is.number(a); fail()
    is.number(d); fail()
    is.number(e); fail()
  })

  it('.notNumber asserts a value is not a number', function () {
    is.notNumber(u); pass()
    is.notNumber(n); pass()
    is.notNumber(t); pass()
    is.notNumber(f); pass()
    is.notNumber(i); fail()
    is.notNumber(s); pass()
    is.notNumber(F); pass()
    is.notNumber(o); pass()
    is.notNumber(a); pass()
    is.notNumber(d); pass()
    is.notNumber(e); pass()
  })

  it('.string asserts a value is a string', function () {
    is.string(u); fail()
    is.string(n); fail()
    is.string(t); fail()
    is.string(f); fail()
    is.string(i); fail()
    is.string(s); pass()
    is.string(F); fail()
    is.string(o); fail()
    is.string(a); fail()
    is.string(d); fail()
    is.string(e); fail()
  })

  it('.notString asserts a value is not a string', function () {
    is.notString(u); pass()
    is.notString(n); pass()
    is.notString(t); pass()
    is.notString(f); pass()
    is.notString(i); pass()
    is.notString(s); fail()
    is.notString(F); pass()
    is.notString(o); pass()
    is.notString(a); pass()
    is.notString(d); pass()
    is.notString(e); pass()
  })

  it('.function asserts a value is a function', function () {
    is.function(u); fail()
    is.function(n); fail()
    is.function(t); fail()
    is.function(f); fail()
    is.function(i); fail()
    is.function(s); fail()
    is.function(F); pass()
    is.function(o); fail()
    is.function(a); fail()
    is.function(d); fail()
    is.function(e); fail()
  })

  it('.notFunction asserts a value is not a function', function () {
    is.notFunction(u); pass()
    is.notFunction(n); pass()
    is.notFunction(t); pass()
    is.notFunction(f); pass()
    is.notFunction(i); pass()
    is.notFunction(s); pass()
    is.notFunction(F); fail()
    is.notFunction(o); pass()
    is.notFunction(a); pass()
    is.notFunction(d); pass()
    is.notFunction(e); pass()
  })

  it('.object asserts a value is an object', function () {
    is.object(u); fail()
    is.object(n); pass()
    is.object(t); fail()
    is.object(f); fail()
    is.object(i); fail()
    is.object(s); fail()
    is.object(F); fail()
    is.object(o); pass()
    is.object(a); pass()
    is.object(d); pass()
    is.object(e); pass()
  })

  it('.notObject asserts a value is not an object', function () {
    is.notObject(u); pass()
    is.notObject(n); fail()
    is.notObject(t); pass()
    is.notObject(f); pass()
    is.notObject(i); pass()
    is.notObject(s); pass()
    is.notObject(F); pass()
    is.notObject(o); fail()
    is.notObject(a); fail()
    is.notObject(d); fail()
    is.notObject(e); fail()
  })

  it('.instanceOf asserts a value is a instance of a given class', function () {
    is.instanceOf(u, Object); fail()
    is.instanceOf(n, Object); fail()
    is.instanceOf(t, Object); fail()
    is.instanceOf(f, Object); fail()
    is.instanceOf(i, Object); fail()
    is.instanceOf(s, String); fail()
    is.instanceOf(F, Function); pass()
    is.instanceOf(o, Object); pass()
    is.instanceOf(a, Array); pass()
    is.instanceOf(d, Date); pass()
    is.instanceOf(e, Error); pass()
  })

  it('.notInstanceOf asserts a value is not a instance of a given class', function () {
    is.notInstanceOf(u, Object); pass()
    is.notInstanceOf(n, Object); pass()
    is.notInstanceOf(t, Object); pass()
    is.notInstanceOf(f, Object); pass()
    is.notInstanceOf(i, Object); pass()
    is.notInstanceOf(s, String); pass()
    is.notInstanceOf(F, Function); fail()
    is.notInstanceOf(o, Object); fail()
    is.notInstanceOf(a, Array); fail()
    is.notInstanceOf(d, Date); fail()
    is.notInstanceOf(e, Error); fail()
  })

  it('.null asserts a value is null', function () {
    is.null(u); fail()
    is.null(n); pass()
    is.null(t); fail()
    is.null(f); fail()
    is.null(i); fail()
    is.null(s); fail()
    is.null(F); fail()
    is.null(o); fail()
    is.null(a); fail()
    is.null(d); fail()
    is.null(e); fail()
  })

  it('.notNull asserts a value is not null', function () {
    is.notNull(u); pass()
    is.notNull(n); fail()
    is.notNull(t); pass()
    is.notNull(f); pass()
    is.notNull(i); pass()
    is.notNull(s); pass()
    is.notNull(F); pass()
    is.notNull(o); pass()
    is.notNull(a); pass()
    is.notNull(d); pass()
    is.notNull(e); pass()
  })

  it('.nan asserts a value is NaN', function () {
    is.nan(u); pass()
    is.nan(n); fail()
    is.nan(t); fail()
    is.nan(f); fail()
    is.nan(i); fail()
    is.nan(s); fail()
    is.nan(F); pass()
    is.nan(o); pass()
    is.nan(a); fail()
    is.nan(d); fail()
    is.nan(e); pass()
    is.nan('1'); fail()
    is.nan('one'); pass()
  })

  it('.notNan asserts a value is not NaN', function () {
    is.notNan(u); fail()
    is.notNan(n); pass()
    is.notNan(t); pass()
    is.notNan(f); pass()
    is.notNan(i); pass()
    is.notNan(s); pass()
    is.notNan(F); fail()
    is.notNan(o); fail()
    is.notNan(a); pass()
    is.notNan(d); pass()
    is.notNan(e); fail()
    is.notNan('1'); pass()
    is.notNan('one'); fail()
  })

  it('.array asserts an object is an array', function () {
    is.array(u); fail()
    is.array(n); fail()
    is.array(t); fail()
    is.array(f); fail()
    is.array(i); fail()
    is.array(s); fail()
    is.array(F); fail()
    is.array(o); fail()
    is.array(a); pass()
    is.array(d); fail()
    is.array(e); fail()
  })

  it('.notArray asserts an object is not an array', function () {
    is.notArray(u); pass()
    is.notArray(n); pass()
    is.notArray(t); pass()
    is.notArray(f); pass()
    is.notArray(i); pass()
    is.notArray(s); pass()
    is.notArray(F); pass()
    is.notArray(o); pass()
    is.notArray(a); fail()
    is.notArray(d); pass()
    is.notArray(e); pass()
  })

  it('.date asserts an object is a date', function () {
    is.date(F); fail()
    is.date(o); fail()
    is.date(a); fail()
    is.date(d); pass()
    is.date(e); fail()
  })

  it('.notDate asserts an object is not a date', function () {
    is.notDate(F); pass()
    is.notDate(o); pass()
    is.notDate(a); pass()
    is.notDate(d); fail()
    is.notDate(e); pass()
  })

  it('.error asserts an object is an error', function () {
    is.error(F); fail()
    is.error(o); fail()
    is.error(a); fail()
    is.error(d); fail()
    is.error(e); pass()
  })

  it('.notError asserts an object is not an error', function () {
    is.notError(F); pass()
    is.notError(o); pass()
    is.notError(a); pass()
    is.notError(d); pass()
    is.notError(e); fail()
  })

  it('.regExp asserts an object is a regular expression', function () {
    is.regExp(F); fail()
    is.regExp(o); fail()
    is.regExp(a); fail()
    is.regExp(d); fail()
    is.regExp(e); fail()
    is.regExp(r); pass()
  })

  it('.notRegExp asserts an object is not a regular expression', function () {
    is.notRegExp(F); pass()
    is.notRegExp(o); pass()
    is.notRegExp(a); pass()
    is.notRegExp(d); pass()
    is.notRegExp(e); pass()
    is.notRegExp(r); fail()
  })

  it('.true asserts a value is true', function () {
    is.true(u); fail()
    is.true(n); fail()
    is.true(t); pass()
    is.true(f); fail()
    is.true(i); fail()
    is.true(s); fail()
    is.true(F); fail()
    is.true(o); fail()
    is.true(a); fail()
    is.true(d); fail()
    is.true(e); fail()
  })

  it('.notTrue asserts a value is not true', function () {
    is.notTrue(u); pass()
    is.notTrue(n); pass()
    is.notTrue(t); fail()
    is.notTrue(f); pass()
    is.notTrue(i); pass()
    is.notTrue(s); pass()
    is.notTrue(F); pass()
    is.notTrue(o); pass()
    is.notTrue(a); pass()
    is.notTrue(d); pass()
    is.notTrue(e); pass()
  })

  it('.false asserts a value is false', function () {
    is.false(u); fail()
    is.false(n); fail()
    is.false(t); fail()
    is.false(f); pass()
    is.false(i); fail()
    is.false(s); fail()
    is.false(F); fail()
    is.false(o); fail()
    is.false(a); fail()
    is.false(d); fail()
    is.false(e); fail()
  })

  it('.notFalse asserts a value is not false', function () {
    is.notFalse(u); pass()
    is.notFalse(n); pass()
    is.notFalse(t); pass()
    is.notFalse(f); fail()
    is.notFalse(i); pass()
    is.notFalse(s); pass()
    is.notFalse(F); pass()
    is.notFalse(o); pass()
    is.notFalse(a); pass()
    is.notFalse(d); pass()
    is.notFalse(e); pass()
  })

  it('.truthy asserts a value evaluates to true', function () {
    is.truthy(1); pass()
    is.truthy(true); pass()
    is.truthy('hello'); pass()
    is.truthy([]); pass()
    is.truthy({}); pass()
    is.truthy(0); fail()
    is.truthy(false); fail()
    is.truthy(''); fail()
    is.truthy({}.undefined); fail(4)
  })

  it('.falsy asserts a value evaluates to true', function () {
    is.falsy(0); pass()
    is.falsy(false); pass()
    is.falsy(''); pass()
    is.falsy({}.undefined); pass()
    is.falsy(1); fail()
    is.falsy(true); fail()
    is.falsy('boom'); fail()
    is.falsy([]); fail()
    is.falsy({}); fail()
  })

  it('.in asserts a string or pattern is in a value', function () {
    is.in('aba', 'b'); pass()
    is.in('b', 'aba'); fail()
    is.in('aba', /b/); pass()
    is.in(/b/, 'aba'); fail()
  })

  it('.notIn asserts a string or pattern is not in a value', function () {
    is.notIn('aba', 'b'); fail()
    is.notIn('b', 'aba'); pass()
    is.notIn('aba', /b/); fail()
    is.notIn(/b/, 'aba'); pass()
  })

  var a3 = [1, 2, 3]

  it('.lengthOf asserts an array has a given length', function () {
    is.lengthOf(a, 0); pass()
    is.lengthOf(a, 1); fail()
    is.lengthOf(o, 0); fail()
    is.lengthOf(a3, 3); pass()
    is.lengthOf(s, 0); fail()
  })

  it('.notLengthOf asserts a value is not an array or is not a given length', function () {
    is.notLengthOf(a, 0); fail()
    is.notLengthOf(a, 1); pass()
    is.notLengthOf(o, 0); pass()
    is.notLengthOf(a3, 3); fail()
    is.notLengthOf(s, 0); pass()
  })

  var ao = [{}]
  var as = ['a', 'b']
  var aa = [[1], [2]]

  it('.arrayOf asserts the value is an array of a given type or class', function () {
    is.arrayOf(a); fail()
    is.arrayOf(n, 'object'); fail()
    is.arrayOf(a, 'object'); pass()
    is.arrayOf(ao, Object); pass()
    is.arrayOf(aa, Array); pass()
    is.arrayOf(as, 'string'); pass()
    is.arrayOf(a3, 'string'); fail()
    is.arrayOf(a3, 'number'); pass()
  })

  it('.notArrayOf asserts the value is an array of a given type or class', function () {
    is.notArrayOf(a); fail()
    is.notArrayOf(n, 'object'); pass()
    is.notArrayOf(a, 'object'); fail()
    is.notArrayOf(ao, Object); fail()
    is.notArrayOf(aa, Array); fail()
    is.notArrayOf(as, 'string'); fail()
    is.notArrayOf(a3, 'string'); pass()
    is.notArrayOf(a3, 'number'); fail()
  })

  afterEach(function () {
    unmock(is)
  })

  after(function () {
    unmock(is)
  })

})
