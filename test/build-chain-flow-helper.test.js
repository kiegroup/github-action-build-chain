const {
  getCheckoutInfo,
  checkoutDefinitionTree,
  getFinalDefinitionFilePath
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/git");
const {
  doesBranchExist: doesBranchExistMock,
  clone: cloneMock,
  merge: mergeMock,
  hasPullRequest: hasPullRequestMock,
  getForkedProject: getForkedProjectMock
} = require("../src/lib/git");

const { getTreeForProject } = require("@kie/build-chain-configuration-reader");
const path = require("path");

const { checkUrlExist } = require("../src/lib/util/http");
jest.mock("../src/lib/util/http");

afterEach(() => {
  jest.clearAllMocks();
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
  expect(result.targetBranch).toEqual("targetBranch");
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("targetGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
  expect(result.targetBranch).toEqual("targetBranch");
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result.project).toEqual("projectXFroked");
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
  expect(result.targetBranch).toEqual("targetBranch");
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
  expect(result.targetBranch).toEqual("targetBranch");
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("targetGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
  expect(result.targetBranch).toEqual("targetBranch");
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result.project).toEqual("projectX");
  expect(result.group).toEqual("targetGroup");
  expect(result.branch).toEqual("targetBranch");
  expect(result.merge).toEqual(false);
  expect(result.targetBranch).toEqual("targetBranch");
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(result).toEqual(undefined);
});

test("getCheckoutInfo. group and targetBranch exist. Same owner and group", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(true);
  const context = {
    octokit: "octokitclient",
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
  await getCheckoutInfo(
    context,
    "sourceGroup",
    "projectX",
    context.config.github.targetBranch
  );
  // Assert
  expect(getForkedProjectMock).toHaveBeenCalledTimes(0);
  expect(doesBranchExistMock).toHaveBeenCalledTimes(1);
  expect(doesBranchExistMock).toHaveBeenCalledWith(
    "octokitclient",
    "sourceGroup",
    "projectX",
    "sourceBranch"
  );
});

test("getCheckoutInfo. sourceBranch and sourceTarget exist with merge. Mapping matching", async () => {
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch,
    { source: "targetBranch", target: "mappedTargetBranch" }
  );
  // Assert
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
  expect(result.targetBranch).toEqual("mappedTargetBranch");
});

test("getCheckoutInfo. sourceBranch and sourceTarget exist with merge. Mapping not matching", async () => {
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
  const result = await getCheckoutInfo(
    context,
    "targetGroup",
    "projectX",
    context.config.github.targetBranch,
    { source: "targetBranchX", target: "mappedTargetBranch" }
  );
  // Assert
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
  expect(result.targetBranch).toEqual("targetBranch");
});

test("checkoutDefinitionTree", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(2);
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "sourceGroup",
    "droolsjbpm-build-bootstrap-forked",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(2);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "folder/kiegroup/lienzo_core",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/droolsjbpm-build-bootstrap",
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "tBranch"
  );

  expect(result.length).toBe(2);
  expect(result[0].project).toStrictEqual("kiegroup/lienzo-core");
  expect(result[0].checkoutInfo).toStrictEqual({
    project: "lienzo-core-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
  expect(result[1].project).toStrictEqual(
    "kiegroup/droolsjbpm-build-bootstrap"
  );
  expect(result[1].checkoutInfo).toStrictEqual({
    project: "droolsjbpm-build-bootstrap-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
});

test("checkoutDefinitionTree has no PR", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(2);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "folder/kiegroup/lienzo_core",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/sourceGroup/droolsjbpm-build-bootstrap-forked",
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "sBranch"
  );

  expect(result.length).toBe(2);
  expect(result[0].project).toStrictEqual("kiegroup/lienzo-core");
  expect(result[0].checkoutInfo).toStrictEqual({
    project: "lienzo-core-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
  expect(result[1].project).toStrictEqual(
    "kiegroup/droolsjbpm-build-bootstrap"
  );
  expect(result[1].checkoutInfo).toStrictEqual({
    project: "droolsjbpm-build-bootstrap-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: false
  });
});

test("checkoutDefinitionTree sBranch does not exists but has PR", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(2);
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "kiegroup",
    "droolsjbpm-build-bootstrap",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(2);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "folder/kiegroup/lienzo_core",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/droolsjbpm-build-bootstrap",
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "tBranch"
  );

  expect(result.length).toBe(2);
  expect(result[0].project).toStrictEqual("kiegroup/lienzo-core");
  expect(result[0].checkoutInfo).toStrictEqual({
    project: "lienzo-core-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
  expect(result[1].project).toStrictEqual(
    "kiegroup/droolsjbpm-build-bootstrap"
  );
  expect(result[1].checkoutInfo).toStrictEqual({
    project: "droolsjbpm-build-bootstrap",
    group: "kiegroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
});

test("checkoutDefinitionTree sBranch does not exists but has PR no root Folder", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: undefined
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(2);
  expect(mergeMock).toHaveBeenCalledWith(
    "./kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "./kiegroup/droolsjbpm_build_bootstrap",
    "kiegroup",
    "droolsjbpm-build-bootstrap",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(2);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "./kiegroup/lienzo_core",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/droolsjbpm-build-bootstrap",
    "./kiegroup/droolsjbpm_build_bootstrap",
    "tBranch"
  );

  expect(result.length).toBe(2);
  expect(result[0].project).toStrictEqual("kiegroup/lienzo-core");
  expect(result[0].checkoutInfo).toStrictEqual({
    project: "lienzo-core-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
  expect(result[1].project).toStrictEqual(
    "kiegroup/droolsjbpm-build-bootstrap"
  );
  expect(result[1].checkoutInfo).toStrictEqual({
    project: "droolsjbpm-build-bootstrap",
    group: "kiegroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
});

test("checkoutDefinitionTree sBranch does not exists but has no PR", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(2);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "folder/kiegroup/lienzo_core",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/droolsjbpm-build-bootstrap",
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "sBranch"
  );

  expect(result.length).toBe(2);
  expect(result[0].project).toStrictEqual("kiegroup/lienzo-core");
  expect(result[0].checkoutInfo).toStrictEqual({
    project: "lienzo-core-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
  expect(result[1].project).toStrictEqual(
    "kiegroup/droolsjbpm-build-bootstrap"
  );
  expect(result[1].checkoutInfo).toStrictEqual({
    project: "droolsjbpm-build-bootstrap",
    group: "kiegroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: false
  });
});

test("checkoutDefinitionTree sBranch does not exists but tBranch", async () => {
  // Arrange
  const project = "kiegroup/droolsjbpm-build-bootstrap";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(2);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "folder/kiegroup/lienzo_core",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/droolsjbpm-build-bootstrap",
    "folder/kiegroup/droolsjbpm_build_bootstrap",
    "tBranch"
  );

  expect(result.length).toBe(2);
  expect(result[0].project).toStrictEqual("kiegroup/lienzo-core");
  expect(result[0].checkoutInfo).toStrictEqual({
    project: "lienzo-core-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: true
  });
  expect(result[1].project).toStrictEqual(
    "kiegroup/droolsjbpm-build-bootstrap"
  );
  expect(result[1].checkoutInfo).toStrictEqual({
    project: "droolsjbpm-build-bootstrap",
    group: "kiegroup",
    branch: "tBranch",
    targetGroup: "kiegroup",
    targetBranch: "tBranch",
    merge: false
  });
});

test("checkoutDefinitionTree with mapping", async () => {
  // Arrange
  const project = "kiegroup/optaplanner";
  const definitionTree = await getTreeForProject(
    path.join(".", "test", "resources", "build-config", "build-config.yaml"),
    project
  );

  const context = {
    config: {
      github: {
        serverUrl: "URL",
        sourceGroup: "sourceGroup",
        author: "author",
        sourceBranch: "sBranch",
        targetBranch: "7.x"
      },
      rootFolder: "folder"
    }
  };
  getForkedProjectMock
    .mockResolvedValueOnce({ name: "optaplanner-forked" })
    .mockResolvedValueOnce({ name: "jbpm-forked" })
    .mockResolvedValueOnce({ name: "drools-forked" })
    .mockResolvedValueOnce({ name: "appformer-forked" })
    .mockResolvedValueOnce({ name: "kie-soup-forked" })
    .mockResolvedValueOnce({ name: "lienzo-tests-forked" })
    .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
    .mockResolvedValueOnce({ name: "lienzo-core-forked" });
  doesBranchExistMock
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  hasPullRequestMock
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);

  // Act
  const result = await checkoutDefinitionTree(context, definitionTree);

  // Assert
  expect(mergeMock).toHaveBeenCalledTimes(8);
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/optaplanner",
    "sourceGroup",
    "optaplanner-forked",
    "sBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/jbpm",
    "sourceGroup",
    "jbpm-forked",
    "sBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/drools",
    "sourceGroup",
    "drools-forked",
    "sBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/kiegroup/lienzo_core",
    "sourceGroup",
    "lienzo-core-forked",
    "sBranch"
  );

  expect(cloneMock).toHaveBeenCalledTimes(8);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/optaplanner",
    "folder/kiegroup/optaplanner",
    "7.x"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/jbpm",
    "folder/kiegroup/jbpm",
    "master"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/drools",
    "folder/kiegroup/drools",
    "master"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/kiegroup/lienzo-core",
    "folder/kiegroup/lienzo_core",
    "master"
  );

  expect(result.length).toBe(8);
  expect(result[7].project).toStrictEqual("kiegroup/optaplanner");
  expect(result[7].checkoutInfo).toStrictEqual({
    project: "optaplanner-forked",
    group: "sourceGroup",
    branch: "sBranch",
    targetGroup: "kiegroup",
    targetBranch: "7.x",
    merge: true
  });
});

test("getFinalDefinitionFilePath no url", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        sourceGroup: "sGroup",
        group: "tGroup",
        project: "projectx",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      }
    }
  };
  const definitionFile = "./definition-file.yaml";
  // Act
  const result = await getFinalDefinitionFilePath(context, definitionFile);

  // Assert
  expect(result).toBe(definitionFile);
});

test("getFinalDefinitionFilePath url no ${} expression", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        sourceGroup: "sGroup",
        group: "tGroup",
        project: "projectx",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      }
    }
  };
  const definitionFile = "http://whateverurl.domain/file.yaml";
  // Act
  const result = await getFinalDefinitionFilePath(context, definitionFile);

  // Assert
  expect(result).toBe(definitionFile);
});

test("getFinalDefinitionFilePath url. source group and branch ok", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        sourceGroup: "sGroup",
        group: "tGroup",
        project: "projectx",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      }
    }
  };
  const definitionFile =
    "http://whateverurl.domain/${GROUP}/${PROJECT_NAME}/${BRANCH}/file.yaml";
  checkUrlExist.mockResolvedValueOnce(true);
  // Act
  const result = await getFinalDefinitionFilePath(context, definitionFile);

  // Assert
  expect(checkUrlExist).toHaveBeenCalledTimes(1);
  expect(result).toBe(
    "http://whateverurl.domain/sGroup/projectx/sBranch/file.yaml"
  );
});

test("getFinalDefinitionFilePath url. target group and source branch ok", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        sourceGroup: "sGroup",
        group: "tGroup",
        project: "projectx",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      }
    }
  };
  const definitionFile =
    "http://whateverurl.domain/${GROUP}/${PROJECT_NAME}/${BRANCH}/file.yaml";
  checkUrlExist.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  // Act
  const result = await getFinalDefinitionFilePath(context, definitionFile);

  // Assert
  expect(checkUrlExist).toHaveBeenCalledTimes(2);
  expect(result).toBe(
    "http://whateverurl.domain/tGroup/projectx/sBranch/file.yaml"
  );
});

test("getFinalDefinitionFilePath url. target group and branch ok", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        sourceGroup: "sGroup",
        group: "tGroup",
        project: "projectx",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      }
    }
  };
  const definitionFile =
    "http://whateverurl.domain/${GROUP}/${PROJECT_NAME}/${BRANCH}/file.yaml";
  checkUrlExist
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  // Act
  const result = await getFinalDefinitionFilePath(context, definitionFile);

  // Assert
  expect(checkUrlExist).toHaveBeenCalledTimes(3);
  expect(result).toBe(
    "http://whateverurl.domain/tGroup/projectx/tBranch/file.yaml"
  );
});

test("getFinalDefinitionFilePath url. error", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        sourceGroup: "sGroup",
        group: "tGroup",
        project: "projectx",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      }
    }
  };
  const definitionFile =
    "http://whateverurl.domain/${GROUP}/${PROJECT_NAME}/${BRANCH}/file.yaml";
  checkUrlExist
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false);
  // Act
  try {
    await getFinalDefinitionFilePath(context, definitionFile);
  } catch (ex) {
    expect(ex.message).toBe(
      "Definition file http://whateverurl.domain/${GROUP}/${PROJECT_NAME}/${BRANCH}/file.yaml does not exist for any of these cases: http://whateverurl.domain/sGroup/projectx/sBranch/file.yaml, http://whateverurl.domain/tGroup/projectx/sBranch/file.yaml or http://whateverurl.domain/tGroup/projectx/tBranch/file.yaml"
    );
  }
});
