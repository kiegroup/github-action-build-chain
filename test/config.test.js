const { createConfig } = require("../src/lib/config");
jest.mock("../src/lib/action-utils", () => ({
  getWorkflowfileName: () => {
    return "pull_request.yml";
  },
  getEnv: () => {
    return { ENV_KEY: "env value" };
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
      jobName: "githubJob",
      ref: undefined,
      sourceRepository: "group/projectx",
      repository: "kiegroup/github-action-build-chain",
      workflow: ".github/workflows/pull_request.yml",
      workflowName: "build chain name"
    },
    rootFolder: "folder",
    env: { ENV_KEY: "env value" }
  };
  expect(config).toEqual(expected);
});
