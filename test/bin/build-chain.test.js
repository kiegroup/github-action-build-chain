const { main } = require("../../bin/build-chain");
const {
  createOctokitInstance,
  getArguments,
  getProcessEnvVariable,
  isLocallyExecution
} = require("../../src/lib/util/execution-util");
jest.mock("../../src/lib/util/execution-util");
const { isPullRequestFlowType } = require("../../src/lib/util/action-utils");
jest.mock("../../src/lib/util/action-utils");

const {
  executeLocally,
  executeFromEvent
} = require("../../bin/flows/build-chain-pull-request");
jest.mock("../../bin/flows/build-chain-pull-request");
require("dotenv").config();

afterEach(() => {
  jest.clearAllMocks();
});

test("buildChain test locally pull request", async () => {
  // Arrange
  const octokitMockInstance = "octokitinstance";
  getArguments.mockReturnValueOnce({
    df: ["definition-file"],
    f: ["pr"],
    url: ["URL"],
    folder: ["folderx"]
  });
  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);
  isLocallyExecution.mockReturnValueOnce(true);
  isPullRequestFlowType.mockReturnValueOnce(true);

  // Act
  await main();

  // Assert
  expect(executeLocally).toHaveBeenCalledWith(
    "githubtoken",
    octokitMockInstance,
    process.env,
    "folderx",
    "URL"
  );
});

test("buildChain test event pull request", async () => {
  // Arrange
  const octokitMockInstance = "octokitinstance";
  getArguments.mockReturnValueOnce({
    df: ["definition-file"],
    f: ["pr"],
    url: ["URL"],
    folder: ["folderx"]
  });
  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);
  isLocallyExecution.mockReturnValueOnce(false);
  isPullRequestFlowType.mockReturnValueOnce(true);

  // Act
  await main();

  // Assert
  expect(executeLocally).toHaveBeenCalledTimes(0);
  expect(executeFromEvent).toHaveBeenCalledTimes(1);
  expect(executeFromEvent).toHaveBeenCalledWith(
    "githubtoken",
    octokitMockInstance,
    process.env
  );
});
