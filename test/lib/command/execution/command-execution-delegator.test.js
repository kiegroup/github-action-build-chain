const {
  executeCommand
} = require("../../../../src/lib/command/execution/command-execution-delegator");
jest.mock("../../../../src/lib/command/execution/export-execution", () => ({
  execute: (cwd, command) => {
    return `${cwd} ${command} [EXPORT]`;
  }
}));

jest.mock("../../../../src/lib/command/execution/bash-execution", () => ({
  execute: (cwd, command) => {
    return `${cwd} ${command} [BASH]`;
  }
}));

jest.mock("../../../../src/lib/common");

test("executeCommand bash", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "mvn clean install";
  // Act
  const result = await executeCommand(cwd, command);

  // Assert
  expect(result).toEqual(`${cwd} ${command} [BASH]`);
});

test("executeCommand export", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "export VARIABLE=pepe";
  // Act
  const result = await executeCommand(cwd, command);

  // Assert
  expect(result).toEqual(`${cwd} ${command} [EXPORT]`);
});
