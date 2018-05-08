import { all, get, set, merge, clearStale, remove } from "./cache";

const MSISDN_1 = "50253185402";
const MSISDN_2 = "50254025318";

test("Cache behavior", () => {
  return new Promise(resolve => {
    expect(all()).toEqual({});

    set(MSISDN_1, { foo: "bar" }, 1);

    expect(Object.keys(all())).toEqual([MSISDN_1]);
    expect(all()[MSISDN_1].payload).toEqual({ foo: "bar" });

    let payload = get(MSISDN_1);

    expect(payload).toEqual({ foo: "bar" });

    set(MSISDN_2, { foo: "bar2" }, 2);

    expect(Object.keys(all())).toEqual([MSISDN_1, MSISDN_2]);
    expect(all()[MSISDN_1].payload).toEqual({ foo: "bar" });
    expect(all()[MSISDN_2].payload).toEqual({ foo: "bar2" });

    merge(MSISDN_2, { baz: "qux" });

    expect(Object.keys(all())).toEqual([MSISDN_1, MSISDN_2]);
    expect(all()[MSISDN_1].payload).toEqual({ foo: "bar" });
    expect(all()[MSISDN_2].payload).toEqual({ foo: "bar2", baz: "qux" });

    merge(MSISDN_2, { foo: "bar3" });

    expect(Object.keys(all())).toEqual([MSISDN_1, MSISDN_2]);
    expect(all()[MSISDN_1].payload).toEqual({ foo: "bar" });
    expect(all()[MSISDN_2].payload).toEqual({ foo: "bar3", baz: "qux" });

    setTimeout(() => {
      clearStale();
      expect(Object.keys(all())).toEqual([MSISDN_2]);
      expect(all()[MSISDN_2].payload).toEqual({ foo: "bar3", baz: "qux" });

      remove(MSISDN_2);

      expect(all()).toEqual({});

      resolve();
    }, 1010);
  });
});
