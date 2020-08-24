const { executeGitHubAction } = require("../src/lib/api");
const { start: startMock } = require("../src/lib/build-chain-flow");
jest.mock("../src/lib/build-chain-flow");

test("executeGitHubAction", async () => {
  // Arrange
  const context = {};
  // Act
  await executeGitHubAction(context);
  // Assert
  expect(startMock).toHaveBeenCalledTimes(1);
  expect(startMock).toHaveBeenCalledWith(context);
});
