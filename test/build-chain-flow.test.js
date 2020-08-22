const { start } = require("../src/lib/build-chain-flow");
const {
  checkoutProject,
  getDir
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/build-chain-flow-helper");
const {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation
} = require("../src/lib/workflow-informaton-reader");
jest.mock("../src/lib/workflow-informaton-reader");
const {
  run: runUploadArtifactsMock
} = require("../src/lib/artifacts/upload-artifacts");
jest.mock("../src/lib/artifacts/upload-artifacts");

const { execute } = require("../src/lib/command");
jest.mock("../src/lib/command");
jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

test("start no parent dependencies", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectX",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder",
      matrixVariables: { key1: "value1", key2: "value2" }
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectX",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command 1", "command 2"],
    buildCommandsUpstream: ["upstream 1", "upstream 2"],
    buildCommandsDownstream: ["downstream 1", "downstream 2"]
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  checkoutParentsAndGetWorkflowInformation.mockResolvedValueOnce([]);
  getDir
    .mockReturnValueOnce("folder/projectX")
    .mockReturnValueOnce("folder/projectX");

  // Act
  await start(context);
  // Assert
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(context, "projectX", {
    group: "defaultGroup"
  });
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "projectX",
    "job-id",
    "main.yaml",
    "defaultGroup",
    { key1: "value1", key2: "value2" },
    "folder/projectX"
  );
  expect(readWorkflowInformation).toHaveBeenCalledTimes(1);
  expect(getDir).toHaveBeenCalledTimes(2);
  expect(execute).toHaveBeenCalledWith(
    "folder/projectX",
    "command 1",
    "projectX"
  );
  expect(execute).toHaveBeenCalledWith(
    "folder/projectX",
    "command 2",
    "projectX"
  );
  expect(execute).toHaveBeenCalledTimes(2);
  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(0);
});

test("start no parent dependencies archive artifacts", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectX",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder",
      matrixVariables: { key1: "value1", key2: "value2" }
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectX",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command 1"],
    buildCommandsUpstream: ["upstream 1"],
    buildCommandsDownstream: ["downstream 1"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifact1"
    }
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  checkoutParentsAndGetWorkflowInformation.mockResolvedValueOnce([]);
  getDir
    .mockReturnValueOnce("folder/projectX")
    .mockReturnValueOnce("folder/projectX");
  runUploadArtifactsMock
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await start(context);
  // Assert
  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(1);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    name: "artifact1",
    path: "whateverpath"
  });
});

test("start with parent dependencies without upstream command", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectXChild",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder",
      matrixVariables: { key1: "value1", key2: "value2" }
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXChild",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"]
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"]
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  checkoutParentsAndGetWorkflowInformation.mockResolvedValueOnce([
    workflowInformationParent
  ]);
  getDir
    .mockReturnValueOnce("folder/projectXChild")
    .mockReturnValueOnce("folder/projectXParent")
    .mockReturnValueOnce("folder/projectXChild");

  // Act
  await start(context);
  // Assert
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(context, "projectXChild", {
    group: "defaultGroup"
  });
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "projectXChild",
    "job-id",
    "main.yaml",
    "defaultGroup",
    { key1: "value1", key2: "value2" },
    "folder/projectXChild"
  );
  expect(readWorkflowInformation).toHaveBeenCalledTimes(1);
  expect(getDir).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith(
    "folder/projectXParent",
    "command-parent",
    "projectXParent"
  );
  expect(execute).toHaveBeenCalledWith(
    "folder/projectXChild",
    "command-child",
    "projectXChild"
  );
  expect(execute).toHaveBeenCalledTimes(2);
  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(0);
});

test("start with parent dependencies with upstream command", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectXChild",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder",
      matrixVariables: { key1: "value1", key2: "value2" }
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXChild",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"]
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsUpstream: ["command-parent-upstream"],
    buildCommandsDownstream: ["command-parent-dowstream"]
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  checkoutParentsAndGetWorkflowInformation.mockResolvedValueOnce([
    workflowInformationParent
  ]);
  getDir
    .mockReturnValueOnce("folder/projectXChild")
    .mockReturnValueOnce("folder/projectXParent")
    .mockReturnValueOnce("folder/projectXChild");

  // Act
  await start(context);
  // Assert
  expect(execute).toHaveBeenCalledWith(
    "folder/projectXParent",
    "command-parent-upstream",
    "projectXParent"
  );
  expect(execute).not.toHaveBeenCalledWith(
    "folder/projectXParent",
    "command-parent",
    "projectXParent"
  );
});

test("start with parent dependencies with archive artifacts with path", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectXChild",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder",
      matrixVariables: { key1: "value1", key2: "value2" }
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXChild",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactChild"
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactParent"
    }
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  checkoutParentsAndGetWorkflowInformation.mockResolvedValueOnce([
    workflowInformationParent
  ]);
  getDir
    .mockReturnValueOnce("folder/projectXChild")
    .mockReturnValueOnce("folder/projectXParent")
    .mockReturnValueOnce("folder/projectXChild");
  runUploadArtifactsMock
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await start(context);
  // Assert
  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(2);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactChild"
  });
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactParent"
  });
});

test("start with parent dependencies with archive artifacts one of them without path", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectXChild",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder",
      matrixVariables: { key1: "value1", key2: "value2" }
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXChild",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      name: "artifactChild"
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactParent"
    }
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  checkoutParentsAndGetWorkflowInformation.mockResolvedValueOnce([
    workflowInformationParent
  ]);
  getDir
    .mockReturnValueOnce("folder/projectXChild")
    .mockReturnValueOnce("folder/projectXParent")
    .mockReturnValueOnce("folder/projectXChild");
  runUploadArtifactsMock
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await start(context);
  // Assert
  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(1);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactParent"
  });
});
