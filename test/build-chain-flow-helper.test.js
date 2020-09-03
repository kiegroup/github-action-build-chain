const {
  getCheckoutInfo,
  checkoutDependencies,
  checkoutProject
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

test("checkoutDependencies", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  await checkoutDependencies(
    context,
    dependencies,
    context.config.github.targetBranch
  );
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

test("checkoutProject sGroup/projectXFroked:sBranch exists has PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    { group: "groupx" },
    context.config.github.targetBranch
  );
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
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject sGroup/projectXFroked:sBranch exists has no PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    { group: "groupx" },
    context.config.github.targetBranch
  );
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/sGroup/projectXFroked",
    "folder/projectx",
    "sBranch"
  );
  expect(mergeMock).not.toHaveBeenCalled();
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject sGroup/projectX:sBranch does not exists but groupx/projectX:sBranch has PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    { group: "groupx" },
    context.config.github.targetBranch
  );
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
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject author/projectX:sBranch does not exists but groupx/projectX:sBranch has PR no rootFolder", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    { group: "groupx" },
    context.config.github.targetBranch
  );
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
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject author/projectX:sBranch does not exists but groupx/projectX:sBranch has no PR", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    { group: "groupx" },
    context.config.github.targetBranch
  );
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(0);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "sBranch"
  );
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject author/projectX:sBranch and groupx/projectX:sBranch but groupx/projectX:tBranch", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    { group: "groupx" },
    context.config.github.targetBranch
  );
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(hasPullRequestMock).toHaveBeenCalledTimes(0);
  expect(mergeMock).toHaveBeenCalledTimes(0);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranch"
  );
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject sGroup/projectXFroked:sBranch exists has PR. With mapping matching", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    {
      group: "groupx",
      mapping: { source: "tBranch", target: "tBranchMapped" }
    },
    context.config.github.targetBranch
  );
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranchMapped"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/projectx",
    "sGroup",
    "projectXFroked",
    "sBranch"
  );
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});

test("checkoutProject sGroup/projectXFroked:sBranch exists has PR. With mapping matching", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        flowFile: "main.yml",
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
  const result = await checkoutProject(
    context,
    "projectx",
    {
      group: "groupx",
      mapping: { source: "tBranch", target: "tBranchMapped" }
    },
    context.config.github.targetBranch
  );
  // Assert
  expect(cloneMock).toHaveBeenCalledTimes(1);
  expect(mergeMock).toHaveBeenCalledTimes(1);
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/groupx/projectx",
    "folder/projectx",
    "tBranchMapped"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "folder/projectx",
    "sGroup",
    "projectXFroked",
    "sBranch"
  );
  expect(context.checkoutInfo).toStrictEqual({ projectx: result });
});
