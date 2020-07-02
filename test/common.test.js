const { createConfig } = require("../lib/common");

test("createConfig", () => {
  const config = createConfig({});
  const expected = {};
  expect(config).toEqual(expected);
});
