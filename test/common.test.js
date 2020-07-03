const { createConfig } = require("../src/lib/common");
jest.mock('../src/lib/action-utils', () => ({
  getParentDependencies: () => { return ['lienzo-core', 'lienzo-test', 'drools']; },
  getChildDependencies: () => { return ['lienzo-core', 'lienzo-test', 'drools-jbpm']; }
}));

test("createConfig", () => {
  // Arrange
  const env = {
  'GITHUB_SERVER_URL': 'githubServerUrl',
  'GITHUB_ACTOR': 'author',
  'GITHUB_HEAD_REF': 'githubHeadRef',
  'GITHUB_BASE_REF': 'githubBaseRef',
  'GITHUB_JOB': 'githubJob',
  'GITHUB_REPOSITORY': 'githubRepository',
  'GITHUB_WORKFLOW': 'githubWorkflow',
  };
  const envData = {
    pull_request: {
      repo: {
        full_name: 'fullName'
      }
    }
  };
  // Act
  const config = createConfig(envData, env);
  // Assert
  const expected = {
    'parentDependencies': ['lienzo-core', 'lienzo-test', 'drools'],
    'childDependencies': ['lienzo-core', 'lienzo-test', 'drools-jbpm'],
    'github': {
      'action': undefined,
      'serverUrl': 'githubServerUrl',
      'author': 'author',
      'sourceBranch': 'githubHeadRef',
      'targetBranch': 'githubBaseRef',
      'jobName': 'githubJob',
      'ref': undefined,
      'sourceRepository': 'fullName',
      'repository': 'githubRepository',
      'workflow': 'githubWorkflow'
    }
  };
  expect(config).toEqual(expected);
});
