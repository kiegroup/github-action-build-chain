const { createConfig } = require("../src/lib/config");
jest.mock("../src/lib/action-utils", () => ({
  getWorkflowfileName: () => {
    return "pull_request.yml";
  },
  getArchiveArtifactsName: () => {
    return "artifact x";
  },
  getArchiveArtifactsPath: () => {
    return "path1,path2";
  },
  getArchiveArtifactsIfNoFilesFound: () => {
    return "warn";
  },
  getMatrixVariables: () => {
    return { key1: "value1", key2: "value2" };
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
  const envData = {
    pull_request: {
      repo: {
        full_name: "group/projectx"
      },
      head: {
        repo: {
          full_name: "group/projectx"
        },
        user: {
          login: "user"
        }
      }
    }
  };
  // Act
  const config = await createConfig(envData, "folder", env);
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
      sourceRepository: "group/projectx",
      repository: "kiegroup/github-action-build-chain",
      flowFile: "pull_request.yml",
      workflowName: "build chain name"
    },
    rootFolder: "folder"
  };
  expect(config).toEqual(expected);
});
