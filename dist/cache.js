"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.all = exports.clearStale = exports.merge = exports.remove = exports.get = exports.set = undefined;

var _util = require("util");

var _util2 = _interopRequireDefault(_util);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CACHE = {};

var set = exports.set = function set(msisdn, payload) /* 240 minutes in seconds */
{
  var expiresIn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 14400;

  var expiresAt = Date.now() + expiresIn * 1000;

  CACHE[msisdn] = {
    expiresAt: expiresAt,
    payload: payload
  };

  console.log("CACHE SET", _util2.default.inspect(CACHE, false, null));
};

var get = exports.get = function get(msisdn) {
  var value = CACHE[msisdn];
  if (value && value.expiresAt > Date.now()) {
    return value.payload;
  }
};

var remove = exports.remove = function remove(msisdn) {
  delete CACHE[msisdn];
  console.log("CACHE REMOVE", msisdn, _util2.default.inspect(CACHE, false, null));
};

var merge = exports.merge = function merge(msisdn, payload) {
  var currentPayload = get(msisdn);
  if (currentPayload) {
    CACHE[msisdn].payload = _lodash2.default.merge(currentPayload, payload);
  }

  console.log("CACHE MERGE", msisdn, payload, _util2.default.inspect(CACHE, false, null));
};

var clearStale = exports.clearStale = function clearStale() {
  for (var msisdn in CACHE) {
    if (CACHE.hasOwnProperty(msisdn)) {
      var value = CACHE[msisdn];
      if (value.expiresAt <= Date.now()) {
        delete CACHE[msisdn];
      }
    }
  }

  console.log("CACHE CLEAR STALE", _util2.default.inspect(CACHE, false, null));
};

var all = exports.all = function all() {
  return CACHE;
};

exports.default = {
  get: get,
  set: set,
  remove: remove,
  merge: merge,
  clearStale: clearStale,
  all: all
};