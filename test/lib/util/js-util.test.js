const { hrtimeToMs } = require("../../../src/lib/util/js-util");

describe("hrtimeToMs", () => {
  test("ok no end defined", () => {
    const start = process.hrtime();
    const result = hrtimeToMs(start);

    expect(result).toBeLessThan(1);
  });

  test("ok end defined. Zero nano seconds", () => {
    const end = [3, 0];
    const result = hrtimeToMs(undefined, end);

    expect(result).toBe(3000);
  });

  test("ok end defined. Zero seconds", () => {
    const end = [0, 2000000 * 1000];
    const result = hrtimeToMs(undefined, end);

    expect(result).toBe(2000);
  });
});
