const {
  readWorkflowInformation,
  dependenciesToObject
} = require("../src/lib/workflow-informaton-reader");
jest.mock("../src/lib/git");

afterEach(() => {
  jest.clearAllMocks();
});

test("parseWorkflowInformation without matrix definition", () => {
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

test("dependenciesToObject without branch", () => {
  // Arrange
  const expected = {
    projectA: { group: "defaultGroup" },
    projectB: { group: "defaultGroup" },
    projectC: { group: "defaultGroup" },
    projectD: { group: "defaultGroup" }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA
projectB
 projectC
projectD`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject without branch and with group", () => {
  // Arrange
  const expected = {
    projectA: { group: "groupx" },
    projectB: { group: "groupy" },
    projectC: { group: "groupz" },
    projectD: { group: "defaultGroup" }
  };
  // Act
  const dependencies = dependenciesToObject(
    `groupx/projectA
groupy/projectB
 groupz/projectC
projectD`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single dependency without group", () => {
  // Arrange
  const expected = { projectA: { group: "defaultGroup" } };
  // Act
  const dependencies = dependenciesToObject("projectA", "defaultGroup");
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single dependency with group", () => {
  // Arrange
  const expected = { projectA: { group: "groupx" } };
  // Act
  const dependencies = dependenciesToObject("groupx/projectA", "defaultGroup");
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject with branch", () => {
  // Arrange
  const expected = {
    projectA: { group: "defaultGroup" },
    projectB: {
      group: "defaultGroup",
      mapping: { source: "7.x", target: "master" }
    },
    projectC: { group: "defaultGroup" },
    projectD: {
      group: "defaultGroup",
      mapping: { source: "8.0.0", target: "9.1.1" }
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA
projectB@7.x:master
 projectC
projectD@8.0.0:9.1.1`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});
