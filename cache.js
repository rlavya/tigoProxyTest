import util from "util";
import _ from "lodash";

const CACHE = {};

export const set = (
  msisdn,
  payload,
  expiresIn = 14400 /* 240 minutes in seconds */
) => {
  const expiresAt = Date.now() + expiresIn * 1000;

  CACHE[msisdn] = {
    expiresAt,
    payload
  };

  console.log("CACHE SET", util.inspect(CACHE, false, null));
};

export const get = msisdn => {
  const value = CACHE[msisdn];
  if (value && value.expiresAt > Date.now()) {
    return value.payload;
  }
};

export const remove = msisdn => {
  delete CACHE[msisdn];
  console.log("CACHE REMOVE", msisdn, util.inspect(CACHE, false, null));
};

export const merge = (msisdn, payload) => {
  const currentPayload = get(msisdn);
  if (currentPayload) {
    CACHE[msisdn].payload = _.merge(currentPayload, payload);
  }

  console.log("CACHE MERGE", msisdn, payload, util.inspect(CACHE, false, null));
};

export const clearStale = () => {
  for (let msisdn in CACHE) {
    if (CACHE.hasOwnProperty(msisdn)) {
      let value = CACHE[msisdn];
      if (value.expiresAt <= Date.now()) {
        delete CACHE[msisdn];
      }
    }
  }

  console.log("CACHE CLEAR STALE", util.inspect(CACHE, false, null));
};

export const all = () => {
  return CACHE;
};

export default {
  get,
  set,
  remove,
  merge,
  clearStale,
  all
};
