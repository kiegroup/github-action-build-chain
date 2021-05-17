const { readDefinitionFile } = require("@kie/build-chain-configuration-reader");
jest.mock("@kie/build-chain-configuration-reader");
jest.mock("@actions/core");
const {
  executeBuildCommands
} = require("../../../../src/lib/flows/common/common-helper");
jest.mock("../../../../src/lib/flows/common/common-helper");

const { execute } = require("../../../../src/lib/flows/sections/pre");

afterEach(() => {
  jest.clearAllMocks();
});

test("execution with pre", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {
    pre: "command1"
  };
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(1);
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["command1"],
    "PRE",
    {
      skipStartGroup: true
    }
  );
});

test("execution with pre multiple", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {
    pre: "command1\ncommand2"
  };
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(1);
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["command1", "command2"],
    "PRE",
    {
      skipStartGroup: true
    }
  );
});

test("execution without pre", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {};
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(0);
});
