const { checkUrlExist } = require("../../../src/lib/util/http");

afterEach(() => {
  jest.clearAllMocks();
});

test("checkUrlExist HTTPS OK", async () => {
  // Act
  const result = await checkUrlExist(
    "https://raw.githubusercontent.com/kiegroup/github-action-build-chain/master/package.json"
  );
  // Assert
  expect(result).toBe(true);
});

test("checkUrlExist HTTP NOT OK", async () => {
  // Act
  const result = await checkUrlExist(
    "https://raw.githubusercontent.com/kiegroup/github-action-build-chain/random_branch/nonexistingfile"
  );
  // Assert
  expect(result).toBe(false);
});
