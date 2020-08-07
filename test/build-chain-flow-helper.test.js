const {
  readWorkflowInformation,
  getCheckoutInfo,
  checkoutDependencies
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/git");
const {
  doesBranchExist: doesBranchExistMock,
  clone: cloneMock,
  merge: mergeMock,
  hasPullRequest: hasPullRequestMock
} = require("../src/lib/git");

test("parseWorkflowInformation", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "build-chain",
    "flow.yaml",
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
      appformer: { mapping: { source: "7.x", target: "master" } },
      "lienzo-tests": {}
    },
    parentDependencies: { "lienzo-core": {} }
  };
  expect(expected).toEqual(buildChainInformation);
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
        group: "group",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getCheckoutInfo(context, "projectX");
  // Assert
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
});

test("getCheckoutInfo. group and sourceTarget exist with merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(true);
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
  const result = await getCheckoutInfo(context, "projectX");
  // Assert
  expect(result.group).toEqual("group");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(true);
});

test("getCheckoutInfo. sourceBranch and sourceTarget exist without merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
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
  const result = await getCheckoutInfo(context, "projectX");
  // Assert
  expect(result.group).toEqual("sourceGroup");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. group and sourceTarget exist without merge", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  hasPullRequestMock.mockResolvedValueOnce(false);
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
  const result = await getCheckoutInfo(context, "projectX");
  // Assert
  expect(result.group).toEqual("group");
  expect(result.branch).toEqual("sourceBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. group and targetBranch exist", async () => {
  // Arrange
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
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
  const result = await getCheckoutInfo(context, "projectX");
  // Assert
  expect(result.group).toEqual("group");
  expect(result.branch).toEqual("targetBranch");
  expect(result.merge).toEqual(false);
});

test("getCheckoutInfo. none exist", async () => {
  // Arrange
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false);
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
  const result = await getCheckoutInfo(context, "projectX");
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
        group: "group",
        targetBranch: "tBranch"
      }
    }
  };
  const dependencies = {
    "project-A": {},
    projectB: { mapping: { source: "tBranch", target: "tBranchMapped" } },
    projectC: {},
    projectD: { mapping: { source: "branchX", target: "branchY" } },
    projectE: { mapping: { source: "branchX", target: "tBranchMapped" } }
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
  // Act
  await checkoutDependencies(context, dependencies);
  // Assert
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/group/project-A",
    "project_A",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "project_A",
    "sourceGroup",
    "project-A",
    "sBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/group/projectB",
    "projectB",
    "tBranchMapped"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/group/projectC",
    "projectC",
    "tBranch"
  );
  expect(mergeMock).toHaveBeenCalledWith(
    "projectC",
    "group",
    "projectC",
    "sBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/group/projectD",
    "projectD",
    "tBranch"
  );
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/sourceGroup/projectE",
    "projectE",
    "sBranch"
  );
  expect(mergeMock).not.toHaveBeenCalledWith(
    "projectE",
    "sourceGroup",
    "projectE",
    "sBranch"
  );
  expect(mergeMock).not.toHaveBeenCalledWith(
    "projectE",
    "group",
    "projectE",
    "sBranch"
  );
});
