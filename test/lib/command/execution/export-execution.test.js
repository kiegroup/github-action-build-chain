const {
  execute
} = require("../../../../src/lib/command/execution/export-execution");

const { exec } = require("@actions/exec");
jest.mock("@actions/exec");

test("execute simple export", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "export VARIABLE1=VALUE1";
  // Act
  await execute(cwd, command);

  // Assert
  expect(process.env["VARIABLE1"]).toBe("VALUE1");
  expect(exec).toHaveBeenCalledTimes(0);
});

test("execute command export", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "export VARIABLE1=`whatevercommand`";
  // Act
  await execute(cwd, command);

  // Assert
  expect(exec).toHaveBeenCalledTimes(1);
});
