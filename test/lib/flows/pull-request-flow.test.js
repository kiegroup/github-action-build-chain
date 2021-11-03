const { start } = require("../../../src/lib/flows/pull-request-flow");
const path = require("path");
const {
  checkoutDefinitionTree,
  getDir,
  getPlaceHolders
} = require("../../../src/lib/flows/common/build-chain-flow-helper");
jest.mock("../../../src/lib/flows/common/build-chain-flow-helper");

const {
  archiveArtifacts
} = require("../../../src/lib/artifacts/build-chain-flow-archive-artifact-helper");
jest.mock(
  "../../../src/lib/artifacts/build-chain-flow-archive-artifact-helper"
);

const { executeBuild } = require("../../../src/lib/flows/common/common-helper");
jest.mock("../../../src/lib/flows/common/common-helper");
jest.mock("@actions/core");
const { printCheckoutInformation } = require("../../../src/lib/summary");
jest.mock("../../../src/lib/summary");
jest.mock("../../../src/lib/common");

const {
  getTreeForProject,
  parentChainFromNode
} = require("@kie/build-chain-configuration-reader");
jest.mock("@kie/build-chain-configuration-reader");

const { execute: executePre } = require("../../../src/lib/flows/sections/pre");
const {
  execute: executePost
} = require("../../../src/lib/flows/sections/post");
jest.mock("../../../src/lib/flows/sections/pre");
jest.mock("../../../src/lib/flows/sections/post");

afterEach(() => {
  jest.clearAllMocks();
});

test("start no parent dependencies. project triggering the job", async () => {
  // Arrange
  const project = "kiegroup/lienzo-core";
  const checkoutInfo = {
    project,
    group: "groupx",
    branch: "branchx",
    targetGroup: "targetGroupx",
    targetBranch: "targetBranchx",
    merge: true
  };
  const definitionTree = {};
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
        group: "defaultGroup",
        project,
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        inputs: {
          definitionFile: path.join(
            ".",
            "test",
            "resources",
            "build-config",
            "build-config.yaml"
          )
        },
        repository: project
      },
      rootFolder: "folder"
    }
  };

  getPlaceHolders.mockResolvedValueOnce({});
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  parentChainFromNode.mockResolvedValueOnce([
    { project },
    { project: "project2" }
  ]);
  checkoutDefinitionTree.mockResolvedValueOnce(checkoutInfo);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");
  executeBuild.mockResolvedValueOnce(true);

  // Act
  await start(context, { isArchiveArtifacts: true });
  // Assert
  expect(
    getTreeForProject
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    { token: undefined, urlPlaceHolders: {} }
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(
    context,
    [{ project }, { project: "project2" }],
    "pr",
    { isArchiveArtifacts: true }
  );

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    project,
    { isArchiveArtifacts: true }
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    { project },
    [{ project }, { project: "project2" }],
    ["success", "always"]
  );

  expect(executePre).toHaveBeenCalledTimes(1);
  expect(executePre).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    {
      token: undefined,
      urlPlaceHolders: {}
    }
  );
  expect(executePost).toHaveBeenCalledTimes(1);
  expect(
    executePost
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    true,
    { token: undefined, urlPlaceHolders: {} }
  );
});

test("start no parent dependencies. project triggering the job. isArchiveArtifacts to false", async () => {
  // Arrange
  const project = "kiegroup/lienzo-core";
  const checkoutInfo = {
    project,
    group: "groupx",
    branch: "branchx",
    targetGroup: "targetGroupx",
    targetBranch: "targetBranchx",
    merge: true
  };
  const definitionTree = {};
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
        group: "defaultGroup",
        project,
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        inputs: {
          definitionFile: path.join(
            ".",
            "test",
            "resources",
            "build-config",
            "build-config.yaml"
          )
        },
        repository: project
      },
      rootFolder: "folder"
    }
  };

  getPlaceHolders.mockResolvedValueOnce({});
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  parentChainFromNode.mockResolvedValueOnce([
    { project },
    { project: "project2" }
  ]);
  checkoutDefinitionTree.mockResolvedValueOnce(checkoutInfo);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");
  executeBuild.mockResolvedValueOnce(true);

  // Act
  await start(context, { isArchiveArtifacts: false });
  // Assert
  expect(
    getTreeForProject
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    { token: undefined, urlPlaceHolders: {} }
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(
    context,
    [{ project }, { project: "project2" }],
    "pr",
    { isArchiveArtifacts: false }
  );

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    project,
    { isArchiveArtifacts: false }
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(0);

  expect(executePre).toHaveBeenCalledTimes(1);
  expect(executePre).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    {
      token: undefined,
      urlPlaceHolders: {}
    }
  );
  expect(executePost).toHaveBeenCalledTimes(1);
  expect(
    executePost
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    true,
    { token: undefined, urlPlaceHolders: {} }
  );
});

test("start no parent dependencies. project triggering the job. Execute Exception", async () => {
  // Arrange
  const project = "kiegroup/lienzo-core";
  const checkoutInfo = {
    project,
    group: "groupx",
    branch: "branchx",
    targetGroup: "targetGroupx",
    targetBranch: "targetBranchx",
    merge: true
  };
  const definitionTree = {};
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
        group: "defaultGroup",
        project,
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        inputs: {
          definitionFile: path.join(
            ".",
            "test",
            "resources",
            "build-config",
            "build-config.yaml"
          )
        },
        repository: project
      },
      rootFolder: "folder"
    }
  };

  getPlaceHolders.mockResolvedValueOnce({});
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  parentChainFromNode.mockResolvedValueOnce([
    { project },
    { project: "project2" }
  ]);
  checkoutDefinitionTree.mockResolvedValueOnce(checkoutInfo);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");
  executeBuild.mockImplementationOnce(async () => {
    throw new Error("error executing command");
  });
  // Act
  try {
    await start(context, { isArchiveArtifacts: true });
  } catch (ex) {
    expect(ex.message).toBe(
      "Command executions have failed, please review latest execution Error: error executing command"
    );
  }
  // Assert
  expect(
    getTreeForProject
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    { token: undefined, urlPlaceHolders: {} }
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(
    context,
    [{ project }, { project: "project2" }],
    "pr",
    { isArchiveArtifacts: true }
  );

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    project,
    { isArchiveArtifacts: true }
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    { project },
    [{ project }, { project: "project2" }],
    ["failure", "always"]
  );

  expect(executePre).toHaveBeenCalledTimes(1);
  expect(executePre).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    {
      token: undefined,
      urlPlaceHolders: {}
    }
  );
  expect(executePost).toHaveBeenCalledTimes(1);
  expect(
    executePost
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    new Error("error executing command"),
    { token: undefined, urlPlaceHolders: {} }
  );
});

test("start no parent dependencies. startingProject", async () => {
  // Arrange
  const project = "kiegroup/lienzo-core";
  const checkoutInfo = {
    project,
    group: "groupx",
    branch: "branchx",
    targetGroup: "targetGroupx",
    targetBranch: "targetBranchx",
    merge: true
  };
  const definitionTree = {};
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
        group: "defaultGroup",
        project,
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        inputs: {
          definitionFile: path.join(
            ".",
            "test",
            "resources",
            "build-config",
            "build-config.yaml"
          ),
          startingProject: "project2"
        },
        repository: project
      },
      rootFolder: "folder"
    }
  };

  getPlaceHolders.mockResolvedValueOnce({});
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  parentChainFromNode.mockResolvedValueOnce([
    { project },
    { project: "project2" }
  ]);
  checkoutDefinitionTree.mockResolvedValueOnce(checkoutInfo);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");
  executeBuild.mockResolvedValueOnce(true);

  // Act
  await start(context, { isArchiveArtifacts: true });
  // Assert
  expect(
    getTreeForProject
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    "project2",
    { token: undefined, urlPlaceHolders: {} }
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(
    context,
    [{ project }, { project: "project2" }],
    "pr",
    { isArchiveArtifacts: true }
  );

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    "project2",
    { isArchiveArtifacts: true }
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    { project: "project2" },
    [{ project }, { project: "project2" }],
    ["success", "always"]
  );

  expect(executePre).toHaveBeenCalledTimes(1);
  expect(executePre).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    {
      token: undefined,
      urlPlaceHolders: {}
    }
  );
  expect(executePost).toHaveBeenCalledTimes(1);
  expect(
    executePost
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    true,
    { token: undefined, urlPlaceHolders: {} }
  );
});

test("start no parent dependencies. project triggering the job. Skip Execution", async () => {
  // Arrange
  const project = "kiegroup/lienzo-core";
  const checkoutInfo = {
    project,
    group: "groupx",
    branch: "branchx",
    targetGroup: "targetGroupx",
    targetBranch: "targetBranchx",
    merge: true
  };
  const definitionTree = {};
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
        group: "defaultGroup",
        project,
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        inputs: {
          definitionFile: path.join(
            ".",
            "test",
            "resources",
            "build-config",
            "build-config.yaml"
          )
        },
        repository: project
      },
      rootFolder: "folder"
    }
  };

  getPlaceHolders.mockResolvedValueOnce({});
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  parentChainFromNode.mockResolvedValueOnce([
    { project },
    { project: "project2" }
  ]);
  checkoutDefinitionTree.mockResolvedValueOnce(checkoutInfo);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");
  executeBuild.mockResolvedValueOnce(true);

  // Act
  await start(context, { isArchiveArtifacts: true, skipExecution: true });
  // Assert
  expect(
    getTreeForProject
  ).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    { token: undefined, urlPlaceHolders: {} }
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(
    context,
    [{ project }, { project: "project2" }],
    "pr",
    { isArchiveArtifacts: true, skipExecution: true }
  );

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(0);
  expect(archiveArtifacts).toHaveBeenCalledTimes(0);
  expect(executePre).toHaveBeenCalledTimes(0);
  expect(executePost).toHaveBeenCalledTimes(0);
});
