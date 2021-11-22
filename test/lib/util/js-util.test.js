const { isError } = require("../../../src/lib/util/js-util");

afterEach(() => {
  jest.clearAllMocks();
});

describe("isError", () => {
  test("Object Error", () => {
    const result = isError(new Error("whatever"));

    expect(result).toBe(true);
  });
  test("Object Error", () => {
    class OwnError extends Error {}
    const result = isError(new OwnError("whatever"));

    expect(result).toBe(true);
  });
  test("Object Error", () => {
    const result = isError("whatever");

    expect(result).toBe(false);
  });
});
