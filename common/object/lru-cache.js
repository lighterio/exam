/**
 * Fast LRU Cache, implemented with a doubly-linked loop.
 *
 * @origin https://github.com/lighterio/lighter-common/common/object/lru-cache.js
 * @version 0.0.2
 * @import object/type
 */

var Type = require('./type');
module.exports = Type.extend({

  /**
   * Create a Cache object based on options.
   */
  init: function (options) {
    if (typeof options == 'number') {
      options = {maxSize: options};
    }
    options = options || {};
    this.maxSize = options.maxSize || 1e6;
    this.clear();
  },

  /**
   * Clear the map and close the loop.
   */
  clear: function () {
    this.size = 0;
    this.map = {};
    this._next = this;
    this._prev = this;
  },

  /**
   * Get a value from the map by its key, and treat it as being used.
   */
  get: function (key) {
    var item = this.map[key];
    if (item) {
      if (item != this._next) {
        item.unlink();
        item.link(this);
      }
      return item.value;
    }
  },

  /**
   * Set the value of an item, creating it if it doesn't exist.
   */
  set: function (key, value) {
    var item = this.map[key];
    if (item) {
      item.value = value;
      if (item != this._next) {
        item.unlink();
        item.link(this);
      }
    }
    else {

      // Create an item and add it to the head of the loop.
      item = this.map[key] = new Item(key, value);
      item.link(this);

      // Remove the tail if necessary.
      if (this.size < this.maxSize) {
        this.size++;
      }
      else {
        var tail = this._prev;
        tail.unlink();
        delete this.map[tail.key];
      }
    }
  },

  /**
   * Remove an item by linking adjacent items to each other.
   */
  remove: function (key) {
    var item = this.map[key];
    if (item) {
      var prev = item._prev;
      var next = item._next;
      prev._next = next;
      next._prev = prev;
      delete this.map[key];
    }
  },

  /**
   * Iterate over the key/value pairs in the loop.
   */
  each: function (fn) {
    var item = this._next;
    while (item != this) {
      fn(item.key, item.value);
      item = item._next;
    }
  },

  /**
   * Iterate over the value/key pairs in the loop.
   */
  forEach: function (fn) {
    var item = this._next;
    while (item != this) {
      fn(item.value, item.key);
      item = item._next;
    }
  },

  /**
   * Return a map of keys and values in order of time since used.
   */
  getMap: function () {
    var map = {};
    var item = this._next;
    while (item != this) {
      map[item.key] = item.value;
      item = item._next;
    }
    return map;
  },

  /**
   * Return an array of keys in order of time since used.
   */
  getKeys: function () {
    var keys = new Array(this.size);
    var index = 0;
    var item = this._next;
    while (item != this) {
      keys[index++] = item.key;
      item = item._next;
    }
    return keys;
  },

  /**
   * Return an array of values in order of time since used.
   */
  getValues: function () {
    var values = new Array(this.size);
    var index = 0;
    var item = this._next;
    while (item != this) {
      values[index++] = item.value;
      item = item._next;
    }
    return values;
  },

  /**
   * Return an array of items in order of time since used.
   */
  getItems: function () {
    var items = new Array(this.size);
    var index = 0;
    var item = this._next;
    while (item != this) {
      items[index++] = item;
      item = item._next;
    }
    return items;
  }

});

/**
 * Create a new cache item.
 */
function Item(key, value) {
  this.key = key;
  this.value = value;
  this._prev = null;
  this._next = null;
}

Item.prototype = {

  /**
   * Detach this item from the doubly-linked loop.
   */
  unlink: function () {
    var prev = this._prev;
    var next = this._next;
    prev._next = next;
    next._prev = prev;
  },

  /**
   * Link this item after another.
   */
  link: function (prev) {
    var next = prev._next;
    this._prev = prev;
    this._next = next;
    prev._next = this;
    next._prev = this;
  }

};
