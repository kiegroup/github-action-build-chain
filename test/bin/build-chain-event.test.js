const { main } = require("../../bin/build-chain-event");
const {
  createOctokitInstance,
  getProcessEnvVariable
} = require("../../bin/utils/bin-utils");
jest.mock("../../bin/utils/bin-utils");
const {
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  getFlowType
} = require("../../src/lib/util/action-utils");
jest.mock("../../src/lib/util/action-utils");

const {
  executeFromEvent: pullRequestEventFlow
} = require("../../bin/flows/build-chain-pull-request");
jest.mock("../../bin/flows/build-chain-pull-request");
const {
  executeFromEvent: fdEventFlow
} = require("../../bin/flows/build-chain-full-downstream");
jest.mock("../../bin/flows/build-chain-full-downstream");
const {
  executeFromEvent: singleEventFlow
} = require("../../bin/flows/build-chain-single");
jest.mock("../../bin/flows/build-chain-single");

const { readFile } = require("fs-extra");
jest.mock("fs-extra");

require("dotenv").config();
jest.mock("@actions/core");

const {
  printLocalCommand
} = require("../../bin/utils/print-event-command-utils");
jest.mock("../../bin/utils/print-event-command-utils");

afterEach(() => {
  jest.clearAllMocks();
});

test("buildChain test event pull request", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const eventData = {
    action: "opened",
    ref: `refs/pull/135/merge`,
    type: "pull_request",
    pull_request: {
      head: {
        user: { login: "login" },
        ref: "ref",
        repo: { full_name: projectName }
      },
      base: { ref: "ref", repo: { full_name: projectName } },
      repo: { full_name: projectName }
    }
  };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");

  const octokitMockInstance = "octokitinstance";

  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);
  isPullRequestFlowType.mockReturnValueOnce(true);

  // Act
  await main();

  // Assert
  expect(pullRequestEventFlow).toHaveBeenCalledTimes(1);
  expect(pullRequestEventFlow).toHaveBeenCalledWith(
    "githubtoken",
    octokitMockInstance,
    process.env,
    eventData
  );
  expect(printLocalCommand).toHaveBeenCalledWith(eventData);
});

test("buildChain test event fd", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const eventData = {
    action: "opened",
    ref: `refs/pull/135/merge`,
    type: "pull_request",
    pull_request: {
      head: {
        user: { login: "login" },
        ref: "ref",
        repo: { full_name: projectName }
      },
      base: { ref: "ref", repo: { full_name: projectName } },
      repo: { full_name: projectName }
    }
  };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");

  const octokitMockInstance = "octokitinstance";
  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);
  isPullRequestFlowType.mockReturnValueOnce(false);
  isFDFlowType.mockReturnValueOnce(true);

  // Act
  await main();

  // Assert
  expect(pullRequestEventFlow).toHaveBeenCalledTimes(0);
  expect(fdEventFlow).toHaveBeenCalledTimes(1);
  expect(fdEventFlow).toHaveBeenCalledWith(
    "githubtoken",
    octokitMockInstance,
    process.env,
    eventData
  );
  expect(printLocalCommand).toHaveBeenCalledWith(eventData);
});

test("buildChain test event single", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const eventData = {
    action: "opened",
    ref: `refs/pull/135/merge`,
    type: "pull_request",
    pull_request: {
      head: {
        user: { login: "login" },
        ref: "ref",
        repo: { full_name: projectName }
      },
      base: { ref: "ref", repo: { full_name: projectName } },
      repo: { full_name: projectName }
    }
  };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");

  const octokitMockInstance = "octokitinstance";
  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);
  isPullRequestFlowType.mockReturnValueOnce(false);
  isFDFlowType.mockReturnValueOnce(false);
  isSingleFlowType.mockReturnValueOnce(true);

  // Act
  await main();

  // Assert
  expect(pullRequestEventFlow).toHaveBeenCalledTimes(0);
  expect(singleEventFlow).toHaveBeenCalledTimes(1);
  expect(singleEventFlow).toHaveBeenCalledWith(
    "githubtoken",
    octokitMockInstance,
    process.env,
    eventData
  );
  expect(printLocalCommand).toHaveBeenCalledWith(eventData);
});

test("buildChain test event none", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const eventData = {
    action: "opened",
    ref: `refs/pull/135/merge`,
    type: "pull_request",
    pull_request: {
      head: {
        user: { login: "login" },
        ref: "ref",
        repo: { full_name: projectName }
      },
      base: { ref: "ref", repo: { full_name: projectName } },
      repo: { full_name: projectName }
    }
  };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");

  const octokitMockInstance = "octokitinstance";
  getProcessEnvVariable.mockReturnValueOnce("githubtoken");
  createOctokitInstance.mockReturnValueOnce(octokitMockInstance);
  isPullRequestFlowType.mockReturnValueOnce(false);
  isFDFlowType.mockReturnValueOnce(false);
  isSingleFlowType.mockReturnValueOnce(false);
  getFlowType.mockReturnValueOnce("flowtype");
  getFlowType.mockReturnValueOnce("flowtype");

  // Act
  try {
    await main();
  } catch (ex) {
    expect(ex.message).toBe(
      "flow type input value 'flowtype' is not supported. Please check documentation."
    );
  }

  // Assert
  expect(pullRequestEventFlow).toHaveBeenCalledTimes(0);
  expect(fdEventFlow).toHaveBeenCalledTimes(0);
  expect(printLocalCommand).toHaveBeenCalledWith(eventData);
});
