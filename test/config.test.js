const { createConfig } = require("../src/lib/config");
jest.mock("../src/lib/action-utils", () => ({
  getParentDependencies: () => {
    return { "lienzo-core": {}, "lienzo-test": {}, drools: {} };
  },
  getChildDependencies: () => {
    return { "lienzo-core": {}, "lienzo-test": {}, "drools-jbpm": {} };
  },
  getBuildCommand: () => {
    return "build command";
  },
  getBuildCommandUpstream: () => {
    return "build command upstream";
  },
  getBuildCommandDownstream: () => {
    return "build command downstream";
  }
}));

jest.mock("../src/lib/git", () => ({
  getWorkflowFileName: () => {
    return ".github/workflows/main.yml";
  }
}));

test("createConfig", async () => {
  // Arrange
  const env = {
    GITHUB_SERVER_URL: "githubServerUrl",
    GITHUB_ACTOR: "author",
    GITHUB_HEAD_REF: "githubHeadRef",
    GITHUB_BASE_REF: "githubBaseRef",
    GITHUB_JOB: "githubJob",
    GITHUB_REPOSITORY: "kiegroup/github-action-build-chain",
    GITHUB_WORKFLOW: "build chain name"
  };
  const envData = {
    pull_request: {
      repo: {
        full_name: "fullName"
      }
    }
  };
  // Act
  const config = await createConfig(undefined, envData, env);
  // Assert
  const expected = {
    parentDependencies: { "lienzo-core": {}, "lienzo-test": {}, drools: {} },
    childDependencies: {
      "lienzo-core": {},
      "lienzo-test": {},
      "drools-jbpm": {}
    },
    buildCommands: "build command",
    buildCommandsUpstream: "build command upstream",
    buildCommandsDownstream: "build command downstream",
    github: {
      action: undefined,
      serverUrl: "githubServerUrl",
      author: "author",
      group: "kiegroup",
      project: "github-action-build-chain",
      sourceBranch: "githubHeadRef",
      targetBranch: "githubBaseRef",
      jobName: "githubJob",
      ref: undefined,
      sourceRepository: "fullName",
      repository: "kiegroup/github-action-build-chain",
      workflow: ".github/workflows/main.yml",
      workflowName: "build chain name"
    }
  };
  expect(config).toEqual(expected);
});
