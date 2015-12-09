# Exam Roadmap

***This is a living document. It describes priorities as they are perceived
today, and it can evolve over time.***

## New Logo
Clipboards are not exciting.

## Separate Libraries
The `is` and `mock` libraries should be in their own packages.

## Exam Server
It would be super duper nice to have a UI to run Exam tests.

## Diffs in Comparison
Exam doesn't yet show, for example, the parts of a string match and don't
match an expected string. Mocha is more helpful in this respect, and Exam
should be similarly helpful.

## UI Tests
Exam should be able to run front-end tests via Karma. This will require
a browserified or webpacked bundle.

## Bundle for Speed
Exam is already faster than Mocha in many cases, but it could probably be
even faster if it only used one pre-built file to run a test suite.

## Auto-written Tests
When a large project has very little coverage, it would be nice to be able
to run a command that finds JavaScript/CoffeeScript/etc. files inside the
project directory and generates tests for those files. The first version
could be fairly rudimentary, but the end goal would be to get to 100% code
coverage automatically using a minimal amount of test code.

## Linting and Spell checking
Although they're not the same thing, there are many commonalities between
linting and spell checking. Spelling mistakes and fragile/nonconformant code
can be distracting to those who didn't introduce them (and even to those
who did, when reading later). Additionally, these mistakes can decrease a
potential adopter's confidence in a piece of code since bad spelling and
bad style are often found in bad code. Exam should help you to make sure
none of this happens.

## Auto-correction
Some test failures can be fixed in simple ways:
* Changing an assertion value.
* Inserting a character to fix a syntax error.
* Inserting/removing a semicolon to adhere to the desired code style.
* Correcting a spelling mistake.
It would be great to have a CLI prompt that lists the auto-fixable failures
and asks which ones you would like Exam to fix for you. Also, it would be
good if you could elect for certain types of problems to auto-fix without
even prompting.

## Tests with Other Assertion/Mocking Libraries
Tests have been performed with Chai and other assertion libraries, however
there are no tests in the Exam test suite that ensure compatibility with
multiple popular assertion libraries.

## Builtin Coverage Testing
There are several problems with Exam+Istanbul, at the moment. For some of them,
Istanbul could be monkey-patched, or contributed to. However, there may be
issues that would require sweeping changes, making backward compatibility
infeasible, which is problematic if Istanbul won't follow semver.
* Exam has to force single process mode when running under Istanbul because
  Istanbul doesn't aggregate code hit counts across processes.
* Code in each file gets collapsed, so it looks like every exception occurs
  on line 9.
* There is a long pause at the beginning of a test run when using Istanbul,
  perhaps because it's performing instrumentation rather than running
  incrementally.
* Coverage is not aggregated into a single number, and Istanbul doesn't
  remember previous coverage results, so it's hard to know when you've
  increased or decreased coverage.
* Istanbul has no watch mode, so you have to manually re-run coverage tests
  each time you want to check it.
* Detailed results give line numbers for uncovered blocks, but they also give
  a ton of other stuff. It would be nice to just see the 1st N uncovered areas
  in your code so that you know the next few places to increase coverage.

## Auto Multi-Process
Node's startup time is non-negligible, so for smaller suites, multi-process
mode is actually slower. That's why Exam defaults to single-process mode. It
would be nice if multi-process mode would try to run all of the tests in the
parent process in addition to farming them out to child processes. The report
can be based on whichever suite completes first. In addition, if a test
succeeds in one mode and fails in the other, the reporter could consider it to
have failed. This would be an interesting way to uncover tests that are not
idempotent or isolated.

## Got ideas?
If you have ideas for features that should be in this roadmap, please submit
a pull request.
