const {
  readWorkflowInformation,
  getGroupAndBranchToCheckout,
  checkoutDependencies
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/git");
const {
  doesBranchExist: doesBranchExistMock,
  clone: cloneMock
} = require("../src/lib/git");

test("parseWorkflowInformation", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
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

test("getGroupAndBranchToCheckout. sourceBranch and sourceTarget exist", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(true);
  const context = {
    config: {
      github: {
        author: "author",
        sourceBranch: "sourceBranch",
        group: "group",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getGroupAndBranchToCheckout(context, "projectX");
  // Assert
  expect(result).toEqual(["author", "sourceBranch", true]);
});

test("getGroupAndBranchToCheckout. group and sourceTarget exist", async () => {
  // Arrange
  doesBranchExistMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const context = {
    config: {
      github: {
        author: "author",
        sourceBranch: "sourceBranch",
        group: "group",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getGroupAndBranchToCheckout(context, "projectX");
  // Assert
  expect(result).toEqual(["group", "sourceBranch", true]);
});

test("getGroupAndBranchToCheckout. group and targetBranch exist", async () => {
  // Arrange
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const context = {
    config: {
      github: {
        author: "author",
        sourceBranch: "sourceBranch",
        group: "group",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getGroupAndBranchToCheckout(context, "projectX");
  // Assert
  expect(result).toEqual(["group", "targetBranch", false]);
});

test("getGroupAndBranchToCheckout. none exist", async () => {
  // Arrange
  doesBranchExistMock
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false);
  const context = {
    config: {
      github: {
        author: "author",
        sourceBranch: "sourceBranch",
        group: "group",
        targetBranch: "targetBranch"
      }
    }
  };
  // Act
  const result = await getGroupAndBranchToCheckout(context, "projectX");
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
        author: "author",
        sourceBranch: "sBranch",
        group: "group",
        targetBranch: "tBranch"
      }
    }
  };
  const dependencies = {
    projectA: {},
    projectB: { mapping: { source: "tBranch", target: "tBranchMapped" } },
    projectC: {},
    projectD: { mapping: { source: "branchX", target: "branchY" } }
  };
  doesBranchExistMock
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  // Act
  await checkoutDependencies(context, dependencies);
  // Assert
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/author/projectA",
    "projectA",
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
  expect(cloneMock).toHaveBeenCalledWith(
    "URL/group/projectD",
    "projectD",
    "tBranch"
  );
});
