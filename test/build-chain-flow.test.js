const { start } = require("../src/lib/build-chain-flow");
const path = require("path");
const {
  checkoutDefinitionTree,
  getDir,
  getFinalDefinitionFilePath
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/build-chain-flow-helper");

const {
  run: runUploadArtifactsMock
} = require("../src/lib/artifacts/upload-artifacts");
jest.mock("../src/lib/artifacts/upload-artifacts");

const {
  archiveArtifacts
} = require("../src/lib/artifacts/build-chain-flow-archive-artifact-helper");
jest.mock("../src/lib/artifacts/build-chain-flow-archive-artifact-helper");

const { execute } = require("../src/lib/command/command");
jest.mock("../src/lib/command/command");
jest.mock("@actions/core");
const { printCheckoutInformation } = require("../src/lib/summary");
jest.mock("../src/lib/summary");

const { getTreeForProject } = require("@kie/build-chain-configuration-reader");
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
  const definitionTree = { dependencies: [] };
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

  getFinalDefinitionFilePath.mockResolvedValueOnce("finalDefinitionFilePath");
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  const buildInfo = {
    "build-command": {
      current: "current command",
      upstream: "upstream command",
      before: {
        current: "before current command",
        upstream: "before upstream command"
      },
      after: {
        current: "after current command",
        upstream: "after upstream command"
      }
    }
  };
  checkoutDefinitionTree.mockResolvedValueOnce([
    {
      project,
      checkoutInfo,
      build: buildInfo
    }
  ]);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");

  // Act
  await start(context);
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "finalDefinitionFilePath",
    project
  );
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, definitionTree);
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({
    "kiegroup/lienzo-core": checkoutInfo
  });

  expect(getDir).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "current command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "before current command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "after current command"
  );
  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(0);
});

test("start no parent dependencies. 2 projects", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const checkoutInfo = {
    project,
    group: "groupx",
    branch: "branchx",
    targetGroup: "targetGroupx",
    targetBranch: "targetBranchx",
    merge: true
  };
  const definitionTree = { dependencies: [] };
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
        group: "defaultGroup",
        project: project,
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

  getFinalDefinitionFilePath.mockResolvedValueOnce("finalDefinitionFilePath");
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  const buildInfo = {
    "build-command": {
      current: "current command",
      upstream: "upstream command",
      before: {
        current: "before current command",
        upstream: "before upstream command"
      },
      after: {
        current: "after current command",
        upstream: "after upstream command"
      }
    }
  };
  checkoutDefinitionTree.mockResolvedValueOnce([
    {
      project: "kiegroup/lienzo-core",
      checkoutInfo,
      build: buildInfo
    },
    {
      project,
      checkoutInfo,
      build: buildInfo
    }
  ]);
  getDir
    .mockReturnValueOnce("kiegroup/lienzo_core")
    .mockReturnValueOnce("kiegroup/droolsjbpm_build_bootstrap");

  // Act
  await start(context);
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "finalDefinitionFilePath",
    project
  );
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, definitionTree);
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({
    "kiegroup/lienzo-core": checkoutInfo,
    "kiegroup/droolsjbpm-build-bootstrap": checkoutInfo
  });

  expect(getDir).toHaveBeenCalledTimes(2);

  expect(execute).toHaveBeenCalledTimes(6);
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "upstream command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "before upstream command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "after upstream command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/droolsjbpm_build_bootstrap",
    "current command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/droolsjbpm_build_bootstrap",
    "before current command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/droolsjbpm_build_bootstrap",
    "after current command"
  );

  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(0);
});

test("start no parent dependencies archive artifacts", async () => {
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
  const definitionTree = { dependencies: [] };
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

  getFinalDefinitionFilePath.mockResolvedValueOnce("finalDefinitionFilePath");
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  const buildInfo = {
    "build-command": {
      current: "current command",
      upstream: "upstream command",
      before: {
        current: "before current command",
        upstream: "before upstream command"
      },
      after: {
        current: "after current command",
        upstream: "after upstream command"
      }
    },
    "archive-artifacts": {
      paths: [
        {
          path: "whateverpath",
          on: "success"
        }
      ],
      name: "artifact1",
      dependencies: "none"
    }
  };
  const node = {
    project,
    checkoutInfo,
    build: buildInfo
  };
  checkoutDefinitionTree.mockResolvedValueOnce([node]);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");

  // Act
  await start(context);
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "finalDefinitionFilePath",
    project
  );
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, definitionTree);
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({
    "kiegroup/lienzo-core": checkoutInfo
  });

  expect(getDir).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "current command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "before current command"
  );
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "after current command"
  );

  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    node,
    [node],
    ["success", "always"]
  );
});

test("start no parent dependencies archive artifacts. Execute Exception", async () => {
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
  const definitionTree = { dependencies: [] };
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

  getFinalDefinitionFilePath.mockResolvedValueOnce("finalDefinitionFilePath");
  getTreeForProject.mockResolvedValueOnce(definitionTree);
  const buildInfo = {
    "build-command": {
      current: "current command",
      upstream: "upstream command",
      before: {
        current: "before current command",
        upstream: "before upstream command"
      },
      after: {
        current: "after current command",
        upstream: "after upstream command"
      }
    },
    "archive-artifacts": {
      paths: [
        {
          path: "whateverpath",
          on: "success"
        }
      ],
      name: "artifact1",
      dependencies: "none"
    }
  };
  const node = {
    project,
    checkoutInfo,
    build: buildInfo
  };
  checkoutDefinitionTree.mockResolvedValueOnce([node]);
  getDir.mockReturnValueOnce("kiegroup/lienzo_core");

  execute.mockImplementationOnce(async () => {
    throw new Error("error executing command");
  });

  // Act
  try {
    await start(context);
  } catch (ex) {
    expect(ex.message).toBe(
      "Command executions have failed, please review latest execution Error: error executing command"
    );
  }
  // Assert
  expect(getTreeForProject).toHaveBeenCalledWith(
    "finalDefinitionFilePath",
    project
  );
  expect(checkoutDefinitionTree).toHaveBeenCalledWith(context, definitionTree);
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({
    "kiegroup/lienzo-core": checkoutInfo
  });

  expect(getDir).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(
    "kiegroup/lienzo_core",
    "before current command"
  );

  expect(archiveArtifacts).toHaveBeenCalledTimes(1);
  expect(archiveArtifacts).toHaveBeenCalledWith(
    node,
    [node],
    ["failure", "always"]
  );
});
