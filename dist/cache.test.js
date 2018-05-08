"use strict";

var _cache = require("./cache");

var MSISDN_1 = "50253185402";
var MSISDN_2 = "50254025318";

test("Cache behavior", function () {
  return new Promise(function (resolve) {
    expect((0, _cache.all)()).toEqual({});

    (0, _cache.set)(MSISDN_1, { foo: "bar" }, 1);

    expect(Object.keys((0, _cache.all)())).toEqual([MSISDN_1]);
    expect((0, _cache.all)()[MSISDN_1].payload).toEqual({ foo: "bar" });

    var payload = (0, _cache.get)(MSISDN_1);

    expect(payload).toEqual({ foo: "bar" });

    (0, _cache.set)(MSISDN_2, { foo: "bar2" }, 2);

    expect(Object.keys((0, _cache.all)())).toEqual([MSISDN_1, MSISDN_2]);
    expect((0, _cache.all)()[MSISDN_1].payload).toEqual({ foo: "bar" });
    expect((0, _cache.all)()[MSISDN_2].payload).toEqual({ foo: "bar2" });

    (0, _cache.merge)(MSISDN_2, { baz: "qux" });

    expect(Object.keys((0, _cache.all)())).toEqual([MSISDN_1, MSISDN_2]);
    expect((0, _cache.all)()[MSISDN_1].payload).toEqual({ foo: "bar" });
    expect((0, _cache.all)()[MSISDN_2].payload).toEqual({ foo: "bar2", baz: "qux" });

    (0, _cache.merge)(MSISDN_2, { foo: "bar3" });

    expect(Object.keys((0, _cache.all)())).toEqual([MSISDN_1, MSISDN_2]);
    expect((0, _cache.all)()[MSISDN_1].payload).toEqual({ foo: "bar" });
    expect((0, _cache.all)()[MSISDN_2].payload).toEqual({ foo: "bar3", baz: "qux" });

    setTimeout(function () {
      (0, _cache.clearStale)();
      expect(Object.keys((0, _cache.all)())).toEqual([MSISDN_2]);
      expect((0, _cache.all)()[MSISDN_2].payload).toEqual({ foo: "bar3", baz: "qux" });

      (0, _cache.remove)(MSISDN_2);

      expect((0, _cache.all)()).toEqual({});

      resolve();
    }, 1010);
  });
});