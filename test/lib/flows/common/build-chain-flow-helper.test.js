const {
  getCheckoutInfo,
  checkoutDefinitionTree,
  getPlaceHolders,
  getTarget,
  getForkedProjectName,
  getPlaceHoldersDefaultValues
} = require("../../../../src/lib/flows/common/build-chain-flow-helper");
const {
  doesBranchExist: doesBranchExistMock,
  clone: cloneMock,
  merge: mergeMock,
  rename: renameMock,
  hasPullRequest: hasPullRequestMock,
  getForkedProject: getForkedProjectMock,
  getRepository: getRepositoryMock
} = require("../../../../src/lib/git");
jest.mock("../../../../src/lib/git");

const { getNodeTriggeringJob } = require("../../../../src/lib/util/chain-util");
jest.mock("../../../../src/lib/util/chain-util");

const { copyNodeFolder } = require("../../../../src/lib/util/fs-util");
jest.mock("../../../../src/lib/util/fs-util");

const { checkUrlExist } = require("../../../../src/lib/util/http");
jest.mock("../../../../src/lib/util/http");
jest.mock("../../../../src/lib/common");

afterEach(() => {
  jest.clearAllMocks();
});

describe("getCheckoutInfo", () => {
  test("sourceBranch and sourceTarget exist with merge", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result.group).toEqual("sourceGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(true);
    expect(result.targetBranch).toEqual("targetBranch");
  });

  test("group and sourceTarget exist with merge", async () => {
    // Arrange
    doesBranchExistMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result).not.toBeUndefined();
    expect(result.project).toEqual("projectX");
    expect(result.group).toEqual("targetGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(true);
    expect(result.targetBranch).toEqual("targetBranch");
  });

  test("sourceBranch and sourceTarget exist without merge", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result.project).toEqual("projectXFroked");
    expect(result.group).toEqual("sourceGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(false);
    expect(result.targetBranch).toEqual("targetBranch");
  });

  test("sourceBranch and sourceTarget exist without merge and not existing forked project", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result.project).toEqual("projectX");
    expect(result.group).toEqual("sourceGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(false);
    expect(result.targetBranch).toEqual("targetBranch");
  });

  test("group and sourceTarget exist without merge", async () => {
    // Arrange
    doesBranchExistMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result.project).toEqual("projectX");
    expect(result.group).toEqual("targetGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(false);
    expect(result.targetBranch).toEqual("targetBranch");
  });

  test("group and targetBranch exist", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result.project).toEqual("projectX");
    expect(result.group).toEqual("targetGroup");
    expect(result.branch).toEqual("targetBranch");
    expect(result.merge).toEqual(false);
    expect(result.targetBranch).toEqual("targetBranch");
  });

  test("none exist", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, node);
    // Assert
    expect(result).toEqual(undefined);
  });

  test("group and targetBranch exist. Same owner and group", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "sourceGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    await getCheckoutInfo(context, node, node);
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

  test("sourceBranch and sourceTarget exist with merge. Mapping matching", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: {
        dependant: {
          default: [{ source: "targetBranch", target: "mappedTargetBranch" }]
        }
      }
    };
    const nodeTriggeringJob = {
      project: "kiegroup/drools",
      children: [],
      parents: [],
      repo: { group: "kiegroup", name: "drools" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, nodeTriggeringJob);
    // Assert
    expect(result.group).toEqual("sourceGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(true);
    expect(result.targetBranch).toEqual("mappedTargetBranch");
  });

  test("sourceBranch and sourceTarget exist with merge. Mapping not matching", async () => {
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
    const node = {
      project: "kiegroup/lienzo-core",
      children: [],
      parents: [],
      repo: { group: "targetGroup", name: "projectX" },
      build: { "build-command": [] },
      mapping: { source: "targetBranchX", target: "mappedTargetBranch" }
    };
    const nodeTriggeringJob = {
      project: "kiegroup/drools",
      children: [],
      parents: [],
      repo: { group: "kiegroup", name: "drools" },
      build: { "build-command": [] },
      mapping: undefined
    };
    // Act
    const result = await getCheckoutInfo(context, node, nodeTriggeringJob);
    // Assert
    expect(result.group).toEqual("sourceGroup");
    expect(result.branch).toEqual("sourceBranch");
    expect(result.merge).toEqual(true);
    expect(result.targetBranch).toEqual("targetBranch");
  });
});

describe("checkoutDefinitionTree", () => {
  test("checkoutDefinitionTree", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [] },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);
    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(2);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "URL_with_token/sourceGroup/droolsjbpm-build-bootstrap-forked",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(2);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "tBranch"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "tBranch"
    );

    expect(renameMock).toHaveBeenCalledTimes(2);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(2);
    expect(Object.keys(result)[0]).toStrictEqual("kiegroup/lienzo-core");
    expect(Object.values(result)[0]).toStrictEqual({
      project: "lienzo-core-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
    expect(Object.keys(result)[1]).toStrictEqual(
      "kiegroup/droolsjbpm-build-bootstrap"
    );
    expect(Object.values(result)[1]).toStrictEqual({
      project: "droolsjbpm-build-bootstrap-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
  });

  test("has no PR", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [] },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    hasPullRequestMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(1);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(2);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "tBranch"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "tBranch"
    );

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(2);
    expect(Object.keys(result)[0]).toStrictEqual("kiegroup/lienzo-core");
    expect(Object.values(result)[0]).toStrictEqual({
      project: "lienzo-core-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
    expect(Object.keys(result)[1]).toStrictEqual(
      "kiegroup/droolsjbpm-build-bootstrap"
    );
    expect(Object.values(result)[1]).toStrictEqual({
      project: "droolsjbpm-build-bootstrap",
      group: "kiegroup",
      branch: "tBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: false
    });
  });

  test("sBranch does not exists but has PR", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [] },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(2);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(2);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "tBranch"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "tBranch"
    );

    expect(renameMock).toHaveBeenCalledTimes(2);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(2);
    expect(Object.keys(result)[0]).toStrictEqual("kiegroup/lienzo-core");
    expect(Object.values(result)[0]).toStrictEqual({
      project: "lienzo-core-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
    expect(Object.keys(result)[1]).toStrictEqual(
      "kiegroup/droolsjbpm-build-bootstrap"
    );
    expect(Object.values(result)[1]).toStrictEqual({
      project: "droolsjbpm-build-bootstrap",
      group: "kiegroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
  });

  test("sBranch does not exists but has PR no root Folder", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [] },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: undefined
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(2);
    expect(mergeMock).toHaveBeenCalledWith(
      "kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "kiegroup_droolsjbpm_build_bootstrap",
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(2);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "kiegroup_lienzo_core",
      "tBranch"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "kiegroup_droolsjbpm_build_bootstrap",
      "tBranch"
    );

    expect(renameMock).toHaveBeenCalledTimes(2);
    expect(renameMock).toHaveBeenCalledWith("kiegroup_lienzo_core", "sBranch");
    expect(renameMock).toHaveBeenCalledWith(
      "kiegroup_droolsjbpm_build_bootstrap",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(2);
    expect(Object.keys(result)[0]).toStrictEqual("kiegroup/lienzo-core");
    expect(Object.values(result)[0]).toStrictEqual({
      project: "lienzo-core-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
    expect(Object.keys(result)[1]).toStrictEqual(
      "kiegroup/droolsjbpm-build-bootstrap"
    );
    expect(Object.values(result)[1]).toStrictEqual({
      project: "droolsjbpm-build-bootstrap",
      group: "kiegroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
  });

  test("sBranch does not exists but has no PR", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [] },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(1);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(2);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "tBranch"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "tBranch"
    );

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(2);
    expect(Object.keys(result)[0]).toStrictEqual("kiegroup/lienzo-core");
    expect(Object.values(result)[0]).toStrictEqual({
      project: "lienzo-core-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
    expect(Object.keys(result)[1]).toStrictEqual(
      "kiegroup/droolsjbpm-build-bootstrap"
    );
    expect(Object.values(result)[1]).toStrictEqual({
      project: "droolsjbpm-build-bootstrap",
      group: "kiegroup",
      branch: "tBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: false
    });
  });

  test("sBranch does not exists but tBranch", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [] },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(1);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(2);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "tBranch"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/droolsjbpm-build-bootstrap",
      "folder/kiegroup_droolsjbpm_build_bootstrap",
      "tBranch"
    );

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(2);
    expect(Object.keys(result)[0]).toStrictEqual("kiegroup/lienzo-core");
    expect(Object.values(result)[0]).toStrictEqual({
      project: "lienzo-core-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: true
    });
    expect(Object.keys(result)[1]).toStrictEqual(
      "kiegroup/droolsjbpm-build-bootstrap"
    );
    expect(Object.values(result)[1]).toStrictEqual({
      project: "droolsjbpm-build-bootstrap",
      group: "kiegroup",
      branch: "tBranch",
      targetGroup: "kiegroup",
      targetBranch: "tBranch",
      merge: false
    });
  });

  test("with mapping project NOT triggering the job", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        mapping: undefined
      },
      {
        project: "kiegroup/lienzo-tests",
        repo: { group: "kiegroup", name: "lienzo-tests" },
        mapping: undefined
      },
      {
        project: "kiegroup/kie-soup",
        repo: { group: "kiegroup", name: "kie-soup" },
        mapping: undefined
      },
      {
        project: "kiegroup/appformer",
        repo: { group: "kiegroup", name: "appformer" },
        mapping: undefined
      },
      {
        project: "kiegroup/drools",
        repo: { group: "kiegroup", name: "drools" },
        mapping: undefined
      },
      {
        project: "kiegroup/jbpm",
        repo: { group: "kiegroup", name: "jbpm" },
        mapping: undefined
      },
      {
        project: "kiegroup/optaplanner",
        repo: { group: "kiegroup", name: "optaplanner" },
        mapping: {
          dependencies: {
            default: [
              {
                source: "7.x",
                target: "main"
              }
            ]
          },
          dependant: {
            default: [
              {
                source: "main",
                target: "7.x"
              }
            ]
          },
          exclude: [
            "kiegroup/optaweb-employee-rostering",
            "kiegroup/optaweb-vehicle-routing"
          ]
        }
      }
    ];
    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "main"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
      .mockResolvedValueOnce({ name: "lienzo-tests-forked" })
      .mockResolvedValueOnce({ name: "kie-soup-forked" })
      .mockResolvedValueOnce({ name: "appformer-forked" })
      .mockResolvedValueOnce({ name: "drools-forked" })
      .mockResolvedValueOnce({ name: "jbpm-forked" })
      .mockResolvedValueOnce({ name: "optaplanner-forked" });
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
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);
    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(8);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_optaplanner",
      "URL_with_token/sourceGroup/optaplanner-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_jbpm",
      "URL_with_token/sourceGroup/jbpm-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_drools",
      "URL_with_token/sourceGroup/drools-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(8);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/optaplanner",
      "folder/kiegroup_optaplanner",
      "7.x"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/jbpm",
      "folder/kiegroup_jbpm",
      "main"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/drools",
      "folder/kiegroup_drools",
      "main"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "main"
    );

    expect(renameMock).toHaveBeenCalledTimes(8);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_optaplanner",
      "sBranch"
    );
    expect(renameMock).toHaveBeenCalledWith("folder/kiegroup_jbpm", "sBranch");
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_drools",
      "sBranch"
    );
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(8);
    expect(Object.keys(result)[7]).toStrictEqual("kiegroup/optaplanner");
    expect(Object.values(result)[7]).toStrictEqual({
      project: "optaplanner-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "7.x",
      merge: true
    });
  });

  test("with mapping project triggering the job", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        mapping: undefined
      },
      {
        project: "kiegroup/lienzo-tests",
        repo: { group: "kiegroup", name: "lienzo-tests" },
        mapping: undefined
      },
      {
        project: "kiegroup/kie-soup",
        repo: { group: "kiegroup", name: "kie-soup" },
        mapping: undefined
      },
      {
        project: "kiegroup/appformer",
        repo: { group: "kiegroup", name: "appformer" },
        mapping: undefined
      },
      {
        project: "kiegroup/drools",
        repo: { group: "kiegroup", name: "drools" },
        mapping: undefined
      },
      {
        project: "kiegroup/jbpm",
        repo: { group: "kiegroup", name: "jbpm" },
        mapping: undefined
      },
      {
        project: "kiegroup/optaplanner",
        repo: { group: "kiegroup", name: "optaplanner" },
        mapping: {
          dependencies: {
            default: [
              {
                source: "7.x",
                target: "main"
              }
            ]
          },
          dependant: {
            default: [
              {
                source: "main",
                target: "7.x"
              }
            ]
          },
          exclude: [
            "kiegroup/optaweb-employee-rostering",
            "kiegroup/optaweb-vehicle-routing"
          ]
        }
      }
    ];
    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "7.x"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" })
      .mockResolvedValueOnce({ name: "lienzo-tests-forked" })
      .mockResolvedValueOnce({ name: "kie-soup-forked" })
      .mockResolvedValueOnce({ name: "appformer-forked" })
      .mockResolvedValueOnce({ name: "drools-forked" })
      .mockResolvedValueOnce({ name: "jbpm-forked" })
      .mockResolvedValueOnce({ name: "optaplanner-forked" });
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
    getNodeTriggeringJob.mockReturnValueOnce(
      nodeChain.find(e => e.project === "kiegroup/optaplanner")
    );
    // Act
    const result = await checkoutDefinitionTree(context, nodeChain);

    // Assert
    expect(mergeMock).toHaveBeenCalledTimes(8);
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_optaplanner",
      "URL_with_token/sourceGroup/optaplanner-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_jbpm",
      "URL_with_token/sourceGroup/jbpm-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_drools",
      "URL_with_token/sourceGroup/drools-forked",
      "sBranch"
    );
    expect(mergeMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "URL_with_token/sourceGroup/lienzo-core-forked",
      "sBranch"
    );

    expect(cloneMock).toHaveBeenCalledTimes(8);
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/optaplanner",
      "folder/kiegroup_optaplanner",
      "7.x"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/jbpm",
      "folder/kiegroup_jbpm",
      "main"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/drools",
      "folder/kiegroup_drools",
      "main"
    );
    expect(cloneMock).toHaveBeenCalledWith(
      "URL_with_token/kiegroup/lienzo-core",
      "folder/kiegroup_lienzo_core",
      "main"
    );

    expect(renameMock).toHaveBeenCalledTimes(8);
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_optaplanner",
      "sBranch"
    );
    expect(renameMock).toHaveBeenCalledWith("folder/kiegroup_jbpm", "sBranch");
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_drools",
      "sBranch"
    );
    expect(renameMock).toHaveBeenCalledWith(
      "folder/kiegroup_lienzo_core",
      "sBranch"
    );

    expect(Object.keys(result).length).toBe(8);
    expect(Object.keys(result)[7]).toStrictEqual("kiegroup/optaplanner");
    expect(Object.values(result)[7]).toStrictEqual({
      project: "optaplanner-forked",
      group: "sourceGroup",
      branch: "sBranch",
      targetGroup: "kiegroup",
      targetBranch: "7.x",
      merge: true
    });
  });

  test("with clone", async () => {
    // Arrange
    const nodeChain = [
      {
        project: "kiegroup/lienzo-core",
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "lienzo-core" },
        build: { "build-command": [], clone: "other-folder" },
        mapping: undefined
      },
      {
        project: "kiegroup/droolsjbpm-build-bootstrap",
        dependencies: [],
        children: [],
        parents: [],
        repo: { group: "kiegroup", name: "droolsjbpm-build-bootstrap" },
        build: { "build-command": [] }
      }
    ];

    const context = {
      config: {
        github: {
          serverUrl: "URL",
          serverUrlWithToken: "URL_with_token",
          sourceGroup: "sourceGroup",
          author: "author",
          sourceBranch: "sBranch",
          targetBranch: "tBranch"
        },
        rootFolder: "folder"
      }
    };
    getForkedProjectMock
      .mockResolvedValueOnce({ name: "lienzo-core-forked" })
      .mockResolvedValueOnce({ name: "droolsjbpm-build-bootstrap-forked" });
    doesBranchExistMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    hasPullRequestMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    getNodeTriggeringJob.mockReturnValueOnce(nodeChain[0]);

    // Act
    await checkoutDefinitionTree(context, nodeChain);
    // Assert
    expect(copyNodeFolder).toHaveBeenCalledTimes(1);
    expect(copyNodeFolder).toHaveBeenCalledWith(
      "folder",
      "folder/kiegroup_lienzo_core",
      "other-folder"
    );
  });
});

describe("getPlaceHolders", () => {
  test("no url", async () => {
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
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(result).toStrictEqual({});
  });

  test("url no ${} expression", async () => {
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
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(result).toStrictEqual({});
  });

  test("url. source group and branch ok", async () => {
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
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "sGroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. source group and branch ok Token", async () => {
    // Arrange
    const context = {
      token: "tokenx",
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
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(1);
    expect(checkUrlExist).toHaveBeenCalledWith(
      "http://whateverurl.domain/sGroup/projectx/sBranch/file.yaml",
      "tokenx"
    );
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "sGroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. target group and source branch ok", async () => {
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
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual({
      BRANCH: "tBranch",
      GROUP: "tGroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. target group and branch ok", async () => {
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
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(3);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "tGroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. error", async () => {
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
      await getPlaceHolders(context, definitionFile);
    } catch (ex) {
      expect(ex.message).toBe(
        "Definition file http://whateverurl.domain/${GROUP}/${PROJECT_NAME}/${BRANCH}/file.yaml does not exist for any case. Not default values defined for placeholders."
      );
    }
  });

  test("url. single default value. Exists even before replacing default values", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME}/${BRANCH}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(3);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "tGroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. multiple default value. Exists even before replacing default values", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME:kogito-pipelines}/${BRANCH:main}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(3);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "tGroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. single default value. Having to check default values. source source", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME}/${BRANCH}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(4);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "kiegroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. single default value. Having to check default values. target target", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME}/${BRANCH}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(5);
    expect(result).toStrictEqual({
      BRANCH: "tBranch",
      GROUP: "kiegroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. single default value. Having to check default values. target source", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME}/${BRANCH}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(6);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "kiegroup",
      PROJECT_NAME: "projectx"
    });
  });

  test("url. single default value. Having to check default values. error", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME}/${BRANCH}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    // Act
    try {
      await getPlaceHolders(context, definitionFile);
    } catch (ex) {
      expect(ex.message).toBe(
        "Definition file http://whateverurl.domain/kiegroup/${PROJECT_NAME}/${BRANCH}/file.yaml does not exist for any case. Not default values defined for placeholders."
      );
    }
    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(6);
  });

  test("url. multiple default value. Having to check default values. source source", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME:kogito-pipelines}/${BRANCH:main}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(3);
    expect(result).toStrictEqual({
      BRANCH: "main",
      GROUP: "kiegroup",
      PROJECT_NAME: "kogito-pipelines"
    });
  });

  test("url. multiple default value. Having to check default values. source source", async () => {
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
      "http://whateverurl.domain/${GROUP:kiegroup}/${PROJECT_NAME:kogito-pipelines}/${BRANCH}/file.yaml";
    checkUrlExist
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // Act
    const result = await getPlaceHolders(context, definitionFile);

    // Assert
    expect(checkUrlExist).toHaveBeenCalledTimes(4);
    expect(result).toStrictEqual({
      BRANCH: "sBranch",
      GROUP: "kiegroup",
      PROJECT_NAME: "kogito-pipelines"
    });
  });
});

describe("getTarget", () => {
  test("project triggering the job", () => {
    // Arrange
    const projectTriggeringTheJob = "projectA";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC", "projectD"]
    };
    const currentProject = projectTriggeringTheJob;
    const currentProjectMapping = projectTriggeringTheJobMapping;
    const targetBranch = "branchx";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual(targetBranch);
  });

  test("targetBranch different. No project triggering job mapping", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = undefined;
    const currentProject = "projectA";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      }
    };
    const targetBranch = "branchx";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual(targetBranch);
  });

  test("targetBranch same. No project triggering job mapping", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = undefined;
    const currentProject = "projectA";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      }
    };
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("7.x");
  });

  test("targetBranch same. No project triggering job mapping. Project excluded", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC", "projectD"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectB"]
    };
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual(targetBranch);
  });

  test("targetBranch same. No project triggering job mapping. Project not excluded", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC", "projectD"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectX"]
    };
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("7.x");
  });

  test("targetBranch same. No project triggering job mapping. Project excluded and NO mapping defined", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC", "projectD"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = undefined;
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual(targetBranch);
  });

  test("targetBranch same. No project triggering job mapping. Project excluded and mapping defined", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC", "projectD"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      }
    };
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("7.x");
  });

  test("targetBranch same. No project triggering job mapping. Mapping taken from dependencies (NOT from default", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ],
        projectD: [
          {
            source: "7.x",
            target: "8.x"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = undefined;
    const targetBranch = "7.x";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("8.x");
  });

  test("targetBranch same. No project triggering job mapping. Mapping taken from dependencies (from default)", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = [
      {
        source: "7.x",
        target: "branchX"
      }
    ];
    const targetBranch = "7.x";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("main");
  });

  test("targetBranch same. Both have mapping. Mapping taken from dependencies (from default)", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      }
    };
    const currentProject = "projectD";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "8.x",
            target: "branchX"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "branchX",
            target: "8.x"
          }
        ]
      }
    };
    const targetBranch = "branchX";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("8.x");
  });

  test("targetBranch same. Both have mapping. Mapping taken from dependencies (from project mapping)", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ],
        projectB: [
          {
            source: "9.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      }
    };
    const currentProject = "projectD";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "8.x",
            target: "branchX"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "branchY",
            target: "8.x"
          }
        ],
        projectB: [
          {
            source: "branchX",
            target: "9.x"
          }
        ]
      }
    };
    const targetBranch = "branchX";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("9.x");
  });

  test("targetBranch same. projectB mapping main", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = undefined;
    const currentProject = "projectA";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ],
        projectB: [
          {
            source: "main",
            target: "main-map"
          },
          {
            source: "main",
            target: "main-map"
          }
        ]
      }
    };
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("main-map");
  });

  test("targetBranch same. projectB mapping main", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = undefined;
    const currentProject = "projectA";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ],
        projectB: [
          {
            source: "main",
            target: "main-map"
          },
          {
            source: "main",
            target: "main-map"
          }
        ]
      }
    };
    const targetBranch = "main";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("main-map");
  });

  test("targetBranch same. projectB no matching mapping", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = undefined;
    const currentProject = "projectA";
    const currentProjectMapping = {
      dependencies: {
        default: [
          {
            source: "7.x",
            target: "main"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "mainx",
            target: "7.x.y"
          }
        ],
        projectB: [
          {
            source: "main",
            target: "main-map"
          },
          {
            source: "main",
            target: "main-map"
          }
        ]
      }
    };
    const targetBranch = "mainx";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("7.x.y");
  });

  test("targetBranch same. regex", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "8.x",
            target: "main8.x"
          },
          {
            source: ".*",
            target: "main.*"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = [
      {
        source: "7.x",
        target: "branchX"
      }
    ];
    const targetBranch = "7.x";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("main.*");
  });

  test("targetBranch same. regex2", () => {
    // Arrange
    const projectTriggeringTheJob = "projectB";
    const projectTriggeringTheJobMapping = {
      dependencies: {
        default: [
          {
            source: "8.x",
            target: "main8.x"
          },
          {
            source: "\\d\\..",
            target: "main.*"
          }
        ]
      },
      dependant: {
        default: [
          {
            source: "main",
            target: "7.x"
          }
        ]
      },
      exclude: ["projectC"]
    };
    const currentProject = "projectD";
    const currentProjectMapping = [
      {
        source: "7.x",
        target: "branchX"
      }
    ];
    const targetBranch = "7.x";
    // Act
    const result = getTarget(
      projectTriggeringTheJob,
      projectTriggeringTheJobMapping,
      currentProject,
      currentProjectMapping,
      targetBranch
    );
    // Assert
    expect(result).toStrictEqual("main.*");
  });
});

describe("getForkedProjectName", () => {
  test("same name", async () => {
    // Arrange
    const octokit = "octokit";
    const owner = "owner";
    const project = "project";
    const wantedOwner = "owner";

    // Act
    const result = await getForkedProjectName(
      octokit,
      owner,
      project,
      wantedOwner
    );

    // Assert
    expect(getRepositoryMock).toHaveBeenCalledTimes(0);
    expect(getForkedProjectMock).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual(project);
  });

  test("getForkedProject found", async () => {
    // Arrange
    const octokit = "octokit";
    const owner = "owner";
    const project = "project";
    const wantedOwner = "wantedOwner";
    getRepositoryMock.mockResolvedValueOnce({ name: project });

    // Act
    const result = await getForkedProjectName(
      octokit,
      owner,
      project,
      wantedOwner
    );

    // Assert
    expect(getRepositoryMock).toHaveBeenCalledTimes(1);
    expect(getForkedProjectMock).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual(project);
  });

  test("getForkedProject not found", async () => {
    // Arrange
    const octokit = "octokit";
    const owner = "owner";
    const project = "project";
    const wantedOwner = "wantedOwner";
    getRepositoryMock.mockResolvedValueOnce(undefined);
    getForkedProjectMock.mockResolvedValueOnce({ name: "projectXFroked" });

    // Act
    const result = await getForkedProjectName(
      octokit,
      owner,
      project,
      wantedOwner
    );

    // Assert
    expect(getRepositoryMock).toHaveBeenCalledTimes(1);
    expect(getForkedProjectMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual("projectXFroked");
  });
});

describe("getPlaceHoldersDefaultValues", () => {
  test("single placeholder with default value", () => {
    // Arrange
    const definitionFile =
      "https://raw.githubusercontent.com/${GROUP:kiegroup}/${PROJECT_NAME}/${BRANCH}/.ci/pull-request-config.yaml";

    // Act
    const result = getPlaceHoldersDefaultValues(definitionFile);

    // Assert
    expect(result).not.toBeUndefined();
    expect(Object.keys(result).length).toBe(1);
    expect(result).toMatchObject({ GROUP: "kiegroup" });
  });
  test("multiple placeholder with default value", () => {
    // Arrange
    const definitionFile =
      "https://raw.githubusercontent.com/${GROUP:kiegroup}/${PROJECT_NAME:drools}/${BRANCH:main}/.ci/pull-request-config.yaml";

    // Act
    const result = getPlaceHoldersDefaultValues(definitionFile);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result).toMatchObject({
      GROUP: "kiegroup",
      PROJECT_NAME: "drools",
      BRANCH: "main"
    });
    expect(Object.keys(result).length).toBe(3);
  });
  test("no placeholders", () => {
    // Arrange
    const definitionFile =
      "https://raw.githubusercontent.com/kiegroup/kogito-pipelines/main/.ci/pull-request-config.yaml";

    // Act
    const result = getPlaceHoldersDefaultValues(definitionFile);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result).toMatchObject({});
    expect(Object.keys(result).length).toBe(0);
  });
  test("single placeholder with NO default value", () => {
    // Arrange
    const definitionFile =
      "https://raw.githubusercontent.com/${GROUP}/kiegroup/stable/.ci/pull-request-config.yaml";

    // Act
    const result = getPlaceHoldersDefaultValues(definitionFile);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result).toMatchObject({});
    expect(Object.keys(result).length).toBe(0);
  });
  test("multiple placeholder with NO default value", () => {
    // Arrange
    const definitionFile =
      "https://raw.githubusercontent.com/${GROUP}/${PROJECT_NAME}/${BRANCH}/.ci/pull-request-config.yaml";

    // Act
    const result = getPlaceHoldersDefaultValues(definitionFile);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result).toMatchObject({});
    expect(Object.keys(result).length).toBe(0);
  });
  test("placeholders with expression", () => {
    // Arrange
    const definitionFile =
      "https://raw.githubusercontent.com/${GROUP}/${PROJECT_NAME}/%{process.env.GITHUB_BASE_REF.replace(/(\\d*)\\.(.*)\\.(.*)/g, (m, n1, n2, n3) => `${+n1+7}.${n2}.${n3}`)}/.ci/pull-request-config.yaml";

    // Act
    const result = getPlaceHoldersDefaultValues(definitionFile);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result).toMatchObject({});
    expect(Object.keys(result).length).toBe(0);
  });
});
