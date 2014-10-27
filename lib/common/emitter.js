/**
 * Stripped-down Event Emitter.
 */
var Emitter = module.exports = function () {};

Emitter.prototype = {

  /**
   * Bind a function as a listener for a type of event.
   */
  on: function on(type, fn) {
    var events = this._events = this._events || {};
    var listeners = events[type];
    // If there's only one, don't waste an Array.
    if (!listeners) {
      events[type] = fn;
    }
    // When there's more than one, start an Array.
    else if (typeof listeners == 'function') {
      events[type] = [listeners, fn];
    }
    // When it's already an Array, just push.
    else {
      listeners.push(fn);
    }
  },

  /**
   * Emit an event with optional data.
   */
  emit: function (type, data) {
    var events = this._events;
    if (events) {
      var listeners = events[type];
      if (listeners) {
        // If there's more than one data argument, build an array.
        var n = arguments.length - 1;
        if (n > 1) {
          data = new Array(n);
          while (n) {
            data[--n] = arguments[n + 1];
          }
        }
        // If there's only one listener, run it.
        if (typeof listeners == 'function') {
          if (n > 1) {
            listeners.apply(this, args);
          }
          else {
            listeners.call(this, data);
          }
        }
        // If there's more than one listener, run them all.
        else {
          for (var i = 0, l = listeners.length; i < l; i++) {
            if (n > 1) {
              listeners[i].apply(this, args);
            }
            else {
              listeners[i].call(this, data);
            }
          }
        }
      }
    }
  }

};

/**
 * Extend an object to become an event emitter.
 */
Emitter.extend = function (emitter) {
  var proto = Emitter.prototype;
  emitter = emitter || {};
  for (var key in proto) {
    if (proto.hasOwnProperty(key)) {
      emitter[key] = proto[key];
    }
  }
  return emitter;
};
