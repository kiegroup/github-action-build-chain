const {
  executeFromEvent,
  executeLocally
} = require("../../../bin/flows/build-chain-pull-request");
const { createCommonConfig } = require("../../../src/lib/flows/common/config");
jest.mock("../../../src/lib/flows/common/config");
const { start } = require("../../../src/lib/flows/pull-request-flow");
jest.mock("../../../src/lib/flows/pull-request-flow");
const {
  getProcessEnvVariable
} = require("../../../src/lib/util/execution-util");
jest.mock("../../../src/lib/util/execution-util");
const { readFile } = require("fs-extra");
jest.mock("fs-extra");

afterEach(() => {
  jest.clearAllMocks();
});

test("executeFromEvent", async () => {
  // Arrange
  const eventData = { data: 1 };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  createCommonConfig.mockResolvedValueOnce("commonconfig");
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");
  // Act
  await executeFromEvent("token", "octokit", { key: "value" });

  // Assert
  expect(createCommonConfig).toHaveBeenCalledWith(eventData, undefined, {
    key: "value"
  });
  expect(start).toHaveBeenCalledWith(
    { token: "token", octokit: "octokit", config: "commonconfig" },
    true
  );
});

test("executeLocally", async () => {
  // Arrange
  const pull_request_data = {
    head: { user: { login: "login" }, ref: "ref" },
    base: { ref: "ref", repo: { full_name: "kiegroup/lienzo-core" } }
  };
  const octokit = {
    pulls: {
      get: jest.fn(
        await function () {
          return { data: pull_request_data };
        }
      )
    }
  };
  const eventData = {
    action: "opened",
    ref: `refs/pull/135/merge`,
    type: "pull_request",
    pull_request: pull_request_data
  };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  createCommonConfig.mockResolvedValueOnce("commonconfig");
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");
  // Act
  await executeLocally(
    "token",
    octokit,
    { key: "value" },
    "rootfolder",
    "https://github.com/kiegroup/lienzo-core/pull/135"
  );

  // Assert
  expect(createCommonConfig).toHaveBeenCalledWith(eventData, "rootfolder", {
    GITHUB_ACTION: undefined,
    GITHUB_ACTOR: "login",
    GITHUB_BASE_REF: "ref",
    GITHUB_HEAD_REF: "ref",
    GITHUB_REF: "refs/pull/135/merge",
    GITHUB_REPOSITORY: "kiegroup/lienzo-core",
    GITHUB_SERVER_URL: "https://github.com/",
    key: "value"
  });
  expect(start).toHaveBeenCalledWith(
    { token: "token", octokit, config: "commonconfig" },
    false
  );
});
