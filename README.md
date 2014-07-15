# Exam

[![NPM Version](https://badge.fury.io/js/exam.png)](http://badge.fury.io/js/exam)
[![Build Status](https://travis-ci.org/zerious/exam.png?branch=master)](https://travis-ci.org/zerious/exam)
[![Code Coverage](https://coveralls.io/repos/zerious/exam/badge.png?branch=master)](https://coveralls.io/r/zerious/exam)
[![Dependencies](https://david-dm.org/zerious/exam.png?theme=shields.io)](https://david-dm.org/zerious/exam)
[![Support](http://img.shields.io/gittip/zerious.png)](https://www.gittip.com/zerious/)

Exam is a Node.js test runner with a default assertion library included. It
forks processes to distribute the test load across cores, because your time is
important.

## Quick Start

Install `exam` globally.
```bash
npm i -g exam
```

Make your test directory.
```
cd myapp
mkdir test
```

Write some tests...
```javascript
on("Array", function () {
  on('#indexOf()', function () {
    it("returns -1 when a value isn't found", function () {
      is(-1, [1,2,3].indexOf(5));
      is(-1, [1,2,3].indexOf(0));
    });
  });
});
```
Run tests.
```bash
exam
```

## Test structure

Exam exposes global functions which you can use in your tests.

* `describe(title, fn)` runs `fn` as a suite of tests for a module.
* `it(does, fn)` runs `fn` as a test for something a module does.
* `is(actual, expected)` asserts equality.
* `before(fn)` runs `fn` before a suite.
* `beforeEach(fn)` runs `fn` before each test in a suite.
* `after(fn)` runs `fn` after a suite.
* `afterEach(fn)` runs `fn` after each test in a suite.

## Assertions

You can use exam's `is` assertions, or any other assertion library you want.

## is
The `is` object contains chainable assertion methods, and is an assertion method
itself (AKA `is.is`).

* `is(actual, expected)` or `is.is(actual, expected)` asserts `actual == expected`.
* `is.not(actual, expected)` asserts `actual != expected`.
* `is.equal(actual, expected)` asserts `actual === expected`.
* `is.notEqual(actual, expected)` asserts `actual !== expected`.
* `is.same(actual, expected)` asserts `stringify(actual) == stringify(expected)`.
* `is.notSame(actual, expected)` asserts `stringify(actual) != stringify(expected)`.
* `is.ok(value)` asserts `!!value`.
* `is.notOk(value)` asserts `!value`.
* `is.fail()` throws an Error.


...
