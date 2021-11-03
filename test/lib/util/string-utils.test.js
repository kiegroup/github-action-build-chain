const { truncateString } = require("../../../src/lib/util/string-utils");

afterEach(() => {
  jest.clearAllMocks();
});

describe("truncateString", () => {
  const str =
    "Murcia is the best town in the world, there you can find the best tapa anyone can imagine 'Marinera + Estrella de Levante'. The people is amazing and so charming... You should visit Cabo de Palos and taste 'El Caldero', my goodness!!";
  test("length same length", () => {
    const result = truncateString(str, str.length);

    expect(result).toBe(str);
  });

  test("length undefined", () => {
    const result = truncateString(str);

    expect(result).toBe(str);
  });

  test("length 0", () => {
    const result = truncateString(str, 0);

    expect(result).toBe("...");
  });

  test("length 10", () => {
    const result = truncateString(str, 10);

    expect(result).toBe("Murcia is ...");
  });

  test("length greater than the string length itself", () => {
    const result = truncateString(str, str.length + 10);

    expect(result).toBe(str);
  });

  test("string undefined", () => {
    const result = truncateString(undefined, 10);

    expect(result).toBe(undefined);
  });

  test("length 10 and start 10", () => {
    const result = truncateString(str, 10, 10);

    expect(result).toBe("the best t...");
  });
});
