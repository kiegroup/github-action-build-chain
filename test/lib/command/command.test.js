const { execute } = require("../../../src/lib/command/command");
jest.mock("../../../src/lib/common");

const {
  executeCommand
} = require("../../../src/lib/command/execution/command-execution-delegator");
jest.mock("../../../src/lib/command/execution/command-execution-delegator");

test("command execute", () => {
  // Arrange
  const cwd = "cwd";
  const command = "command";
  // Act
  execute(cwd, command);

  // Assert
  expect(executeCommand).toHaveBeenCalledWith(cwd, command);
});
