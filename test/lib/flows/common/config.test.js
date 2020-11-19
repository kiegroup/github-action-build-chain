const {
  createCommonConfig
} = require("../../../../src/lib/flows/common/config");
jest.mock("../../../../src/lib/util/action-utils", () => ({
  getDefinitionFile: () => {
    return "definition-file.yaml";
  },
  getStartingProject: () => {
    return "projectX";
  }
}));

test("createConfig", async () => {
  // Arrange
  const env = {
    GITHUB_SERVER_URL: "http://github.com/",
    GITHUB_ACTOR: "actor",
    GITHUB_HEAD_REF: "githubHeadRef",
    GITHUB_BASE_REF: "githubBaseRef",
    GITHUB_JOB: "githubJob",
    GITHUB_REPOSITORY: "kiegroup/github-action-build-chain",
    GITHUB_WORKFLOW: "build chain name"
  };
  const eventData = {
    sourceGroup: "group",
    author: "user",
    sourceRepository: "sourceRepository"
  };
  // Act
  const config = await createCommonConfig(eventData, "folder", env);
  // Assert
  const expected = {
    github: {
      action: undefined,
      serverUrl: "http://github.com",
      author: "user",
      actor: "actor",
      sourceGroup: "group",
      group: "kiegroup",
      project: "github-action-build-chain",
      sourceBranch: "githubHeadRef",
      targetBranch: "githubBaseRef",
      jobId: "githubJob",
      ref: undefined,
      sourceRepository: "sourceRepository",
      repository: "kiegroup/github-action-build-chain",
      groupProject: "kiegroup/github-action-build-chain",
      workflowName: "build chain name",
      inputs: {
        definitionFile: "definition-file.yaml",
        startingProject: "projectX"
      }
    },
    rootFolder: "folder"
  };
  expect(config).toEqual(expected);
});
