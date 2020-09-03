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
const { printCheckoutInformation } = require("../src/lib/summary");
jest.mock("../src/lib/summary");

afterEach(() => {
  jest.clearAllMocks();
});

test("start no parent dependencies", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command 1", "command 2"],
    buildCommandsUpstream: ["upstream 1", "upstream 2"],
    buildCommandsDownstream: ["downstream 1", "downstream 2"],
    parentDependencies: [],
    archiveArtifacts: {
      dependencies: "none"
    }
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
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectX",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "projectX",
    "job-id",
    ".github/workflows/main.yaml",
    "defaultGroup",
    { key1: "value1", key2: "value2" },
    "folder/projectX"
  );
  expect(readWorkflowInformation).toHaveBeenCalledTimes(1);

  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

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
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({});
});

test("start no parent dependencies archive artifacts", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command 1"],
    buildCommandsUpstream: ["upstream 1"],
    buildCommandsDownstream: ["downstream 1"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifact1",
      dependencies: "none"
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
    path: "whateverpath",
    dependencies: "none"
  });
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectX",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({});
});

test("start with parent dependencies without upstream command", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      dependencies: "none"
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      dependencies: "none"
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

  // Act
  await start(context);
  // Assert
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectXChild",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "projectXChild",
    "job-id",
    ".github/workflows/main.yaml",
    "defaultGroup",
    { key1: "value1", key2: "value2" },
    "folder/projectXChild"
  );
  expect(readWorkflowInformation).toHaveBeenCalledTimes(1);

  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

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
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({});
});

test("start with parent dependencies with upstream command", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      dependencies: "none"
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsUpstream: ["command-parent-upstream"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      dependencies: "none"
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

  // Act
  await start(context);
  // Assert
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectXChild",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

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
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({});
});

test("start with parent dependencies with archive artifacts with path", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactChild",
      dependencies: ["projectXParent"]
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactParent",
      dependencies: "none"
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
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectXChild",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(2);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactChild",
    dependencies: ["projectXParent"]
  });
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactParent",
    dependencies: "none"
  });
});

test("start with parent dependencies with archive artifacts with path dependencies all", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactChild",
      dependencies: "all"
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactParent",
      dependencies: "none"
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
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectXChild",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(2);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactChild",
    dependencies: "all"
  });
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactParent",
    dependencies: "none"
  });
});

test("start with parent dependencies with archive artifacts with path dependencies not matching", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactChild",
      dependencies: ["projectXParentX"]
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactParent",
      dependencies: "none"
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
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectXChild",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(1);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactChild",
    dependencies: ["projectXParentX"]
  });
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({});
});

test("start with parent dependencies with archive artifacts one of them without path", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobId: "job-id",
        flowFile: "main.yaml",
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
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-child"],
    buildCommandsUpstream: ["command-child-upstream"],
    buildCommandsDownstream: ["command-child-downstream"],
    archiveArtifacts: {
      name: "artifactChild",
      dependencies: ["projectXParent"]
    }
  };

  const workflowInformationParent = {
    id: "build-chain",
    name: "Build Chain",
    project: "projectXParent",
    config: {
      github: {
        flowFile: "main.yaml"
      }
    },
    buildCommands: ["command-parent"],
    buildCommandsDownstream: ["command-parent-dowstream"],
    archiveArtifacts: {
      path: "whateverpath",
      name: "artifactParent",
      dependencies: "none"
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
  expect(checkoutProject).toHaveBeenCalledTimes(1);
  expect(checkoutProject).toHaveBeenCalledWith(
    context,
    "projectXChild",
    {
      group: "defaultGroup"
    },
    context.config.github.targetBranch
  );
  expect(checkoutParentsAndGetWorkflowInformation).toHaveBeenCalledWith(
    context,
    [context.config.github.project],
    context.config.github.project,
    context.config.github.targetBranch,
    workflowInformation
  );

  expect(runUploadArtifactsMock).toHaveBeenCalledTimes(1);
  expect(runUploadArtifactsMock).toHaveBeenCalledWith({
    path: "whateverpath",
    name: "artifactParent",
    dependencies: "none"
  });
  expect(printCheckoutInformation).toHaveBeenCalledTimes(1);
  expect(printCheckoutInformation).toHaveBeenCalledWith({});
});
