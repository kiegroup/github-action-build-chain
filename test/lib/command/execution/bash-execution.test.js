const {
  execute
} = require("../../../../src/lib/command/execution/bash-execution");

const { exec } = require("@actions/exec");
jest.mock("@actions/exec");

test("execute", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "mvn clean install";
  // Act
  await execute(cwd, command);

  // Assert
  expect(exec).toHaveBeenCalledWith(command, [], { cwd });
});

test("execute with options", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "mvn clean install";
  const options = { listener: () => {} };
  // Act
  await execute(cwd, command, options);

  // Assert
  expect(exec).toHaveBeenCalledWith(command, [], { cwd, ...options });
});
