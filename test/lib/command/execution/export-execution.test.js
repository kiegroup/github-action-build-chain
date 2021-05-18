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

test("execute simple export with quotes", async () => {
  // Arrange
  const cwd = "cwd";
  const command = 'export VARIABLE1_B="VALUE1 VALUE2"';
  // Act
  await execute(cwd, command);

  // Assert
  expect(process.env["VARIABLE1_B"]).toBe("VALUE1 VALUE2");
  expect(bashExecute).toHaveBeenCalledTimes(0);
});

test("execute simple export with quotes", async () => {
  // Arrange
  const cwd = "cwd";
  const command = "export VARIABLE1_C='VALUE1 VALUE2'";
  // Act
  await execute(cwd, command);

  // Assert
  expect(process.env["VARIABLE1_C"]).toBe("VALUE1 VALUE2");
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
