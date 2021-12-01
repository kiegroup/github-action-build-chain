const { main } = require("../../src/bin/build-chain-cli");
const {
  createOctokitInstance,
  getProcessEnvVariable,
  addLocalExecutionVariables
} = require("../../src/bin/utils/bin-utils");
jest.mock("../../src/bin/utils/bin-utils");
const {
  getArguments
} = require("../../src/bin/arguments/arguments-constructor");
jest.mock("../../src/bin/arguments/arguments-constructor");
jest.mock("../../src/lib/util/action-utils");

const {
  execute: executeBuild
} = require("../../src/bin/actions/build-actions");
jest.mock("../../src/bin/actions/build-actions");

const { execute: executeTools } = require("../../src/bin/actions/tools-action");
jest.mock("../../src/bin/actions/tools-action");

require("dotenv").config();

afterEach(() => {
  jest.clearAllMocks();
});

test("buildChain execute build", async () => {
  // Arrange
  const octokitMockInstance = "octokitinstance";
  const args = {
    df: ["deffile"],
    action: "build"
  };
  getArguments.mockReturnValueOnce(args);
  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);

  // Act
  await main();

  // Assert
  expect(addLocalExecutionVariables).toHaveBeenCalledWith({
    "definition-file": { value: "deffile", mandatory: true }
  });
  expect(executeBuild).toHaveBeenCalledWith(
    args,
    "githubtoken",
    octokitMockInstance
  );
});

test("buildChain execute tools", async () => {
  // Arrange
  const args = {
    df: ["deffile"],
    action: "tools"
  };
  getArguments.mockReturnValueOnce(args);

  // Act
  await main();

  // Assert
  expect(addLocalExecutionVariables).toHaveBeenCalledWith({
    "definition-file": { value: "deffile", mandatory: true }
  });
  expect(executeTools).toHaveBeenCalledWith(args);
});
