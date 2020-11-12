const {
  executeFromEvent,
  executeLocally
} = require("../../../bin/flows/build-chain-full-downstream");
const { createCommonConfig } = require("../../../src/lib/flows/common/config");
jest.mock("../../../src/lib/flows/common/config");
const { start } = require("../../../src/lib/flows/full-downstream-flow");
jest.mock("../../../src/lib/flows/full-downstream-flow");
const { getProcessEnvVariable } = require("../../../bin/bin-utils");
jest.mock("../../../bin/bin-utils");
const { readFile } = require("fs-extra");
jest.mock("fs-extra");
jest.mock("../../../src/lib/fs-helper");


afterEach(() => {
  jest.clearAllMocks();
});

test("executeFromEvent", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const pull_request_data = {
    head: {
      user: { login: "login" },
      ref: "ref",
      repo: { full_name: projectName }
    },
    base: { ref: "ref", repo: { full_name: projectName } },
    repo: { full_name: projectName }
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
  const expectedGithubInformation = {
    sourceGroup: "kiegroup",
    author: "login",
    sourceRepository: projectName
  };

  // Act
  await executeFromEvent("token", "octokit", { key: "value" });

  // Assert
  expect(createCommonConfig).toHaveBeenCalledWith(
    expectedGithubInformation,
    undefined,
    {
      key: "value"
    }
  );
  expect(start).toHaveBeenCalledWith(
    { token: "token", octokit: "octokit", config: "commonconfig" },
    true
  );
});

test("executeLocally", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const pull_request_data = {
    head: {
      user: { login: "login" },
      ref: "ref",
      repo: { full_name: projectName }
    },
    base: { ref: "ref", repo: { full_name: projectName } },
    repo: { full_name: projectName }
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

  const expectedGithubInformation = {
    sourceGroup: "kiegroup",
    author: "login",
    sourceRepository: projectName
  };
  // Act
  await executeLocally(
    "token",
    octokit,
    { key: "value" },
    "rootfolder",
    "https://github.com/kiegroup/lienzo-core/pull/135"
  );

  // Assert

  expect(createCommonConfig).toHaveBeenCalledWith(
    expectedGithubInformation,
    "rootfolder",
    {
      GITHUB_ACTION: undefined,
      GITHUB_ACTOR: "login",
      GITHUB_BASE_REF: "ref",
      GITHUB_HEAD_REF: "ref",
      GITHUB_REF: "refs/pull/135/merge",
      GITHUB_REPOSITORY: projectName,
      GITHUB_SERVER_URL: "https://github.com/",
      key: "value"
    }
  );
  expect(start).toHaveBeenCalledWith(
    { token: "token", octokit, config: "commonconfig" },
    false
  );
});

test("executeLocally no pull_request.repo info", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const pull_request_data = {
    head: {
      user: { login: "login" },
      ref: "ref",
      repo: { full_name: projectName }
    },
    base: { ref: "ref", repo: { full_name: projectName } }
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
    pull_request: pull_request_data,
    repository: { name: projectName }
  };
  readFile.mockResolvedValueOnce(JSON.stringify(eventData));
  createCommonConfig.mockResolvedValueOnce("commonconfig");
  getProcessEnvVariable.mockReturnValueOnce("githubeventpath");

  const expectedGithubInformation = {
    sourceGroup: "kiegroup",
    author: "login",
    sourceRepository: projectName
  };
  // Act
  await executeLocally(
    "token",
    octokit,
    { key: "value" },
    "rootfolder",
    "https://github.com/kiegroup/lienzo-core/pull/135"
  );

  // Assert

  expect(createCommonConfig).toHaveBeenCalledWith(
    expectedGithubInformation,
    "rootfolder",
    {
      GITHUB_ACTION: undefined,
      GITHUB_ACTOR: "login",
      GITHUB_BASE_REF: "ref",
      GITHUB_HEAD_REF: "ref",
      GITHUB_REF: "refs/pull/135/merge",
      GITHUB_REPOSITORY: projectName,
      GITHUB_SERVER_URL: "https://github.com/",
      key: "value"
    }
  );
  expect(start).toHaveBeenCalledWith(
    { token: "token", octokit, config: "commonconfig" },
    false
  );
});

test("executeLocally no pull_request.repo or eventData.repository info", async () => {
  // Arrange
  const projectName = "kiegroup/lienzo-core";
  const pull_request_data = {
    head: {
      user: { login: "login" },
      ref: "ref",
      repo: { full_name: projectName }
    },
    base: { ref: "ref", repo: { full_name: projectName } }
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

  const expectedGithubInformation = {
    sourceGroup: "kiegroup",
    author: "login",
    sourceRepository: projectName
  };
  // Act
  await executeLocally(
    "token",
    octokit,
    { GITHUB_REPOSITORY: projectName },
    "rootfolder",
    "https://github.com/kiegroup/lienzo-core/pull/135"
  );

  // Assert

  expect(createCommonConfig).toHaveBeenCalledWith(
    expectedGithubInformation,
    "rootfolder",
    {
      GITHUB_ACTION: undefined,
      GITHUB_ACTOR: "login",
      GITHUB_BASE_REF: "ref",
      GITHUB_HEAD_REF: "ref",
      GITHUB_REF: "refs/pull/135/merge",
      GITHUB_SERVER_URL: "https://github.com/",
      GITHUB_REPOSITORY: projectName
    }
  );
  expect(start).toHaveBeenCalledWith(
    { token: "token", octokit, config: "commonconfig" },
    false
  );
});
