const {
  execute
} = require("../../../../src/lib/command/execution/export-execution");

const {
  execute: bashExecute
} = require("../../../../src/lib/command/execution/bash-execution");
jest.mock("../../../../src/lib/command/execution/bash-execution");

test("execute simple export", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "export VARIABLE1=VALUE1";
  // Act
  await execute(cwd, command);

  // Assert
  expect(process.env["VARIABLE1"]).toBe("VALUE1");
  expect(bashExecute).toHaveBeenCalledTimes(0);
});

test("execute command export", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "export VARIABLE1=`whatevercommand`";
  // Act
  await execute(cwd, command);

  // Assert
  expect(bashExecute).toHaveBeenCalledTimes(1);
  expect(bashExecute).toHaveBeenCalledWith(
    cwd,
    "whatevercommand",
    expect.anything()
  );
});
