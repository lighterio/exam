# Exam Roadmap

***This is a living document. It describes priorities as they are perceived
today, and it can evolve over time.***

## Diffs in Comparison
Exam doesn't yet show, for example, the parts of a string match and don't
match an expected string. Mocha is more helpful in this respect, and Exam
should be similarly helpful.

## Bundle for Front-End
Exam should be able to run front-end tests via Karma. This will require
a browserified or webpacked bundle.

## Bundle for Back-End Speed
Exam is already faster than Mocha in many cases, but it could probably be
even faster if it only used one core file to run a test suite.

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

## Got ideas?
If you have ideas for features that should be in this roadmap, please submit
a pull request.

