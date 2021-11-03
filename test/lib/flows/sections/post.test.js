const { readDefinitionFile } = require("@kie/build-chain-configuration-reader");
jest.mock("@kie/build-chain-configuration-reader");
jest.mock("@actions/core");
const {
  executeBuildCommands
} = require("../../../../src/lib/flows/common/common-helper");
jest.mock("../../../../src/lib/flows/common/common-helper");
jest.mock("../../../../src/lib/common");

const { execute } = require("../../../../src/lib/flows/sections/post");

afterEach(() => {
  jest.clearAllMocks();
});

test("execution with post. Success", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {
    post: {
      success: "success command",
      failure: "failure command",
      always: "always command"
    }
  };
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, true, options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(2);
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["success command"],
    "POST SUCCESS",
    {
      skipStartGroup: true
    }
  );
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["always command"],
    "POST ALWAYS",
    {
      skipStartGroup: true
    }
  );
});

test("execution with post. Error", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {
    post: {
      success: "success command",
      failure: "failure command",
      always: "always command"
    }
  };
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, new Error("executiong failure"), options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(2);
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["failure command"],
    "POST FAILURE",
    {
      skipStartGroup: true
    }
  );
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["always command"],
    "POST ALWAYS",
    {
      skipStartGroup: true
    }
  );
});

test("execution with post. Success. Multiple commands", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {
    post: {
      success: "success command\nsuccess command2",
      failure: "failure command\nfailure command2",
      always: "always command\nalways command2"
    }
  };
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, true, options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(2);
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["success command", "success command2"],
    "POST SUCCESS",
    {
      skipStartGroup: true
    }
  );
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["always command", "always command2"],
    "POST ALWAYS",
    {
      skipStartGroup: true
    }
  );
});

test("execution with post. Error. Multiple commands", async () => {
  // Arrange
  const file = "file";
  const options = {};
  const definitionFileContent = {
    post: {
      success: "success command\nsuccess command2",
      failure: "failure command\nfailure command2",
      always: "always command\nalways command2"
    }
  };
  readDefinitionFile.mockResolvedValueOnce(definitionFileContent);

  // Act
  await execute(file, new Error("executiong failure"), options);
  // Assert
  expect(readDefinitionFile).toHaveBeenCalledWith(file, options);
  expect(executeBuildCommands).toHaveBeenCalledTimes(2);
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["failure command", "failure command2"],
    "POST FAILURE",
    {
      skipStartGroup: true
    }
  );
  expect(executeBuildCommands).toHaveBeenCalledWith(
    process.cwd(),
    ["always command", "always command2"],
    "POST ALWAYS",
    {
      skipStartGroup: true
    }
  );
});
