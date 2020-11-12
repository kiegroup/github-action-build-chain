const { start } = require("../../../src/lib/flows/pull-request-flow");
const path = require("path");
const {
  checkoutDefinitionTree,
  getDir,
  getPlaceHolders
} = require("../../../src/lib/flows/common/build-chain-flow-helper");
jest.mock("../../../src/lib/flows/common/build-chain-flow-helper");
jest.mock("../../../src/lib/flows/build-chain-pull-request-helper");

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

const {
  getTreeForProject,
  parentChainFromNode
} = require("@kie/build-chain-configuration-reader");
jest.mock("@kie/build-chain-configuration-reader");

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
  await start(context, true);
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    {}
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, [
    { project },
    { project: "project2" }
  ]);

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    project
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    { project },
    [{ project }, { project: "project2" }],
    ["success", "always"]
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
  await start(context, false);
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    {}
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, [
    { project },
    { project: "project2" }
  ]);

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    project
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(0);
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
    await start(context, true);
  } catch (ex) {
    expect(ex.message).toBe(
      "Command executions have failed, please review latest execution Error: error executing command"
    );
  }
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "test/resources/build-config/build-config.yaml",
    project,
    {}
  );
  expect(parentChainFromNode).toHaveBeenCalledWith(definitionTree);
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, [
    { project },
    { project: "project2" }
  ]);

  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith(checkoutInfo);

  expect(executeBuild).toHaveBeenCalledTimes(1);
  expect(executeBuild).toHaveBeenCalledWith(
    "folder",
    [{ project }, { project: "project2" }],
    project
  );
  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    { project },
    [{ project }, { project: "project2" }],
    ["failure", "always"]
  );
});
