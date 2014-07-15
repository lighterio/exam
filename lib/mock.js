/**
 * Decorate an object with mocked properties.
 */
var mock = module.exports = function mock(object, mockObject) {
  var original = object._EXAM_MOCKED_ORIGINALS;
  if (!original) {
    original = {};
    Object.defineProperty(object, '_EXAM_MOCKED_ORIGINALS', {
      enumerable: false,
      value: original
    });
  }
  for (var name in mockObject) {
    if (mockObject.hasOwnProperty(name)) {
      original[name] = object[name];
      object[name] = mockObject[name];
    }
  }
  return object;
};

/**
 * Restore mocked properties to their original values.
 */
mock.unmock = function unmock(object, mockFields) {
  var original = object._EXAM_MOCKED_ORIGINALS;
  // If the object has no original values for mocked properties.
  if (!original) {
    return;
  }
  if (typeof mockFields == 'string') {
    mockFields = mockFields.split(',');
  }
  if (mockFields instanceof Array) {
    mockFields.forEach(function (name) {
      object[name] = original[name];
    });
  }
  else {
    for (var name in original) {
      if (original.hasOwnProperty(name)) {
        object[name] = original[name];
      }
    }
  }
};
