const {
  readWorkflowInformation,
  getCheckoutInfo,
  checkoutDependencies,
  checkouProject
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/git");
const {
  doesBranchExist: doesBranchExistMock,
  clone: cloneMock,
  merge: mergeMock,
  hasPullRequest: hasPullRequestMock,
  getForkedProject: getForkedProjectMock
} = require("../src/lib/git");

afterEach(() => {
  jest.clearAllMocks();
});

test("parseWorkflowInformation", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "build-chain",
    "flow.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    name: "Build Chain",
    buildCommands: [
      "mvn clean",
      'mvn -e -nsu -Dfull clean install -Prun-code-coverage -Dcontainer.profile=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -DjvmArgs="-Xms1g -Xmx4g -XX:+CMSClassUnloadingEnabled"'
    ],
    buildCommandsUpstream: [
      "mvn clean",
      "mvn -e -T1C clean install -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotbugs.skip=true -Drevapi.skip=true"
    ],
    buildCommandsDownstream: [
      "mvn clean",
      "mvn -e -nsu -fae -T1C clean install -Dfull -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -DjvmArgs=-Xmx4g"
    ],
    childDependencies: {
      appformer: {
        group: "defaultGroup",
        mapping: { source: "7.x", target: "master" }
      },
      "lienzo-tests": { group: "defaultGroup" }
    },
    parentDependencies: {
      "lienzo-core": { group: "defaultGroup" },
      errai: { group: "groupx" }
    }
  };
  expect(expected).toEqual(buildChainInformation);
});

test("parseWorkflowInformation with matrix", () => {
  // Arrange
  const context = {
    config: {
      matrixVariables: {
        os: "rhel",
        "matrix.version": "7",
        sourceBranch: "source",
        "matrix.targetBranch": "target"
      }
    }
  };
  // Act
  const buildChainInformation = readWorkflowInformation(
    "build-chain",
    "flow-matrix.yaml",
    "defaultGroup",
    context.config.matrixVariables,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    name: "Build Chain",
    buildCommands: ["echo rhel", "echo 'without matrix'"],
    buildCommandsUpstream: ["echo rhel", "echo 7", "echo 'without matrix'"],
    buildCommandsDownstream: ["echo 'without matrix'", "echo rhel"],
    childDependencies: {
      appformer: {
        group: "defaultGroup",
        mapping: { source: "source", target: "target" }
      },
      "lienzo-tests": { group: "defaultGroup" }
    },
    parentDependencies: {
      "lienzo-core": { group: "defaultGroup" },
      errai: { group: "groupx" },
      projectx: {
        group: "groupy",
        mapping: { source: "source", target: "master" }
      }
    }
  };
  expect(buildChainInformation).toEqual(expected);
});

test("parseWorkflowInformation with matrix error definition", () => {
  // Act
  try {
    readWorkflowInformation(
      "build-chain",
      "flow-matrix.yaml",
      "defaultGroup",
      undefined,
      "test/resources"
    );
  } catch (e) {
    expect(e.message).toBe(
      "The variable 'sourceBranch' is not defined in \"with\" 'matrix-variables' so it can't be replaced. Please define it in the flow triggering the job."
    );
  }
});

test("getCheckoutInfo. sourceBranch and sourceTarget exist with merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true);
  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        targetBranch: "targetBranch"
      }
    }
  };
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
});

test("getCheckoutInfo. group and sourceTarget exist with merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });
  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        group: "group",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("targetGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
});

test("getCheckoutInfo. sourceBranch and sourceTarget exist without merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });
  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result.project).toEqual("projectXFroked");
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. sourceBranch and sourceTarget exist without merge and not existing forked project", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
  getForkedProjectMock.mockResolvedValueOnce(undefined);
  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. group and sourceTarget exist without merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });
  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("targetGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. group and targetBranch exist", async () => {
  // Arrange
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });
  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("targetGroup");
  expect(result.branch).toEqual("targetBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. none exist", async () => {
  // Arrange
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  const context = {
    config: {
      github: {
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sourceBranch",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "targetGroup", "projectX");
  // Assert
  expect(result).toEqual(undefined);
});

test("checkoutDependencies", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  const dependencies = {
    "project-A": { group: "groupA" },
    projectB: {
      group: "groupB",
      mapping: { source: "tBranch", target: "tBranchMapped" }
    },
    projectC: { group: "groupC" },
    projectD: {
      group: "groupD",
      mapping: { source: "branchX", target: "branchY" }
    },
    projectE: {
      group: "groupE",
      mapping: { source: "branchX", target: "tBranchMapped" }
    }
  };
  doesBranchExistMock
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  hasPullRequestMock
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false);
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "project-A" })
    .mockResolvedValueOnce({ name: "projectB" })
    .mockResolvedValueOnce({ name: "projectC" })
    .mockResolvedValueOnce({ name: "projectD" })
    .mockResolvedValueOnce({ name: "projectEFroked" });
  // Act
  await checkoutDependencies(context, dependencies);
  // Assert
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupA/project-A",
    "folder/project_A",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/project_A",
    "sourceGroup",
    "project-A",
    "sBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupB/projectB",
    "folder/projectB",
    "tBranchMapped"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupC/projectC",
    "folder/projectC",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/projectC",
    "groupC",
    "projectC",
    "sBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupD/projectD",
    "folder/projectD",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/sourceGroup/projectEFroked",
    "folder/projectE",
    "sBranch"
  );
  expect(mergeMock).not.toHaveBeenCalledWith(
    "folder/projectE",
    "sourceGroup",
    "projectEFroked",
    "sBranch"
  );
  expect(mergeMock).not.toHaveBeenCalledWith(
    "folder/projectE",
    "groupE",
    "projectEFroked",
    "sBranch"
  );
});

test("checkouProject sGroup/projectXFroked:sBranch exists has PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: "folder"
    }
  };
  doesBranchExistMock.mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });
  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/projectx",
    "sGroup",
    "projectXFroked",
    "sBranch"
  );
});

test("checkouProject sGroup/projectXFroked:sBranch exists has no PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: "folder"
    }
  };
  doesBranchExistMock.mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });
  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/sGroup/projectXFroked",
    "folder/projectx",
    "sBranch"
  );
  expect(mergeMock).not.toHaveBeenCalled();
});

test("checkouProject sGroup/projectX:sBranch does not exists but groupx/projectX:sBranch has PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: "folder"
    }
  };
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/projectx",
    "groupx",
    "projectx",
    "sBranch"
  );
});

test("checkouProject author/projectX:sBranch does not exists but groupx/projectX:sBranch has PR no rootFolder", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: undefined
    }
  };
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "./projectx",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "./projectx",
    "groupx",
    "projectx",
    "sBranch"
  );
});

test("checkouProject author/projectX:sBranch does not exists but groupx/projectX:sBranch has no PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: "folder"
    }
  };
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(0);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "sBranch"
  );
});

test("checkouProject author/projectX:sBranch and groupx/projectX:sBranch but groupx/projectX:tBranch", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: "folder"
    }
  };
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(hasPullRequestMock).toHaveBeenCalledTimes(0);
  expect(mergeMock).toHaveBeenCalledTimes(0);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranch"
  );
});

test("treatMatrixVariablaes", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        workflow: "main.yml",
        serverUrl: "URL",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch",
        sourceGroup: "sGroup"
      },
      rootFolder: "folder"
    }
  };
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

  // Act
  await checkouProject(context, "projectx", { group: "groupx" });
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(hasPullRequestMock).toHaveBeenCalledTimes(0);
  expect(mergeMock).toHaveBeenCalledTimes(0);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranch"
  );
});
