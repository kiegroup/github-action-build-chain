const {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation
} = require("../src/lib/workflow-informaton-reader");
jest.mock("../src/lib/git");
jest.mock("@actions/core");
const { getDir } = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/build-chain-flow-helper");

afterEach(() => {
  jest.clearAllMocks();
});

test("checkoutParentsAndGetWorkflowInformation no parents", async () => {
  // Arrange
  const project = "parent";
  const context = {
    config: {
      github: {
        jobName: "build-chain",
        workflow: "flow.yaml",
        group: "groupX",
        project: project
      }
    }
  };

  const projectList = [];
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    undefined
  );

  // Assert

  expect(getDir).toHaveBeenCalledTimes(0);
  expect(workflowInformationArray).toStrictEqual([]);
});

test("checkoutParentsAndGetWorkflowInformation 1 level", async () => {
  // Arrange
  getDir.mockReturnValueOnce("./test/resources/hierarchyflows/parent-parent");
  const project = "parent";

  const context = {
    config: {
      github: {
        jobName: "build-chain",
        workflow: "flow.yaml",
        group: "groupX",
        project: project
      }
    }
  };

  const projectList = [];
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    { "parent-parent": { group: "groupX" } }
  );

  // Assert
  expect(workflowInformationArray.length).toBe(1);
  expect(workflowInformationArray[0].project).toBe("parent-parent");
  expect(workflowInformationArray[0].buildCommands).toStrictEqual([
    'echo "parent-parent"'
  ]);
});

test("checkoutParentsAndGetWorkflowInformation 2 levels", async () => {
  // Arrange
  getDir
    .mockReturnValueOnce("./test/resources/hierarchyflows/parent")
    .mockReturnValueOnce("./test/resources/hierarchyflows/parent-parent");
  const project = "child";
  const context = {
    config: {
      github: {
        jobName: "build-chain",
        workflow: "flow.yaml",
        group: "groupX",
        project: project
      }
    }
  };

  const projectList = [];
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    { parent: { group: "groupX" } }
  );

  // Assert
  expect(workflowInformationArray.length).toBe(2);
  expect(workflowInformationArray[0].project).toBe("parent");
  expect(workflowInformationArray[0].buildCommands).toStrictEqual([
    'echo "parent"'
  ]);
  expect(workflowInformationArray[1].project).toBe("parent-parent");
  expect(workflowInformationArray[1].buildCommands).toStrictEqual([
    'echo "parent-parent"'
  ]);
});

test("checkoutParentsAndGetWorkflowInformation 3 levels", async () => {
  // Arrange
  getDir
    .mockReturnValueOnce("./test/resources/hierarchyflows/child")
    .mockReturnValueOnce("./test/resources/hierarchyflows/parent")
    .mockReturnValueOnce("./test/resources/hierarchyflows/parent-parent");

  const project = "child-child";
  const context = {
    config: {
      github: {
        jobName: "build-chain",
        workflow: "flow.yaml",
        group: "groupX",
        project: project
      }
    }
  };

  const projectList = [];
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    { child: { group: "groupX" } }
  );

  // Assert
  expect(workflowInformationArray.length).toBe(3);
  expect(workflowInformationArray[0].project).toBe("child");
  expect(workflowInformationArray[0].buildCommands).toStrictEqual([
    'echo "child"'
  ]);
  expect(workflowInformationArray[1].project).toBe("parent");
  expect(workflowInformationArray[1].buildCommands).toStrictEqual([
    'echo "parent"'
  ]);
  expect(workflowInformationArray[2].project).toBe("parent-parent");
  expect(workflowInformationArray[2].buildCommands).toStrictEqual([
    'echo "parent-parent"'
  ]);
});

test("checkoutParentsAndGetWorkflowInformation 3 levels repeated project", async () => {
  // Arrange
  getDir
    .mockReturnValueOnce("./test/resources/hierarchyflows/child")
    .mockReturnValueOnce("./test/resources/hierarchyflows/parent");

  const project = "child-child";
  const context = {
    config: {
      github: {
        jobName: "build-chain",
        workflow: "flow.yaml",
        group: "groupX",
        project: project
      }
    }
  };

  const projectList = ["parent-parent"];
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    { child: { group: "groupX" } }
  );

  // Assert
  expect(workflowInformationArray.length).toBe(2);
  expect(workflowInformationArray[0].project).toBe("child");
  expect(workflowInformationArray[0].buildCommands).toStrictEqual([
    'echo "child"'
  ]);
  expect(workflowInformationArray[1].project).toBe("parent");
  expect(workflowInformationArray[1].buildCommands).toStrictEqual([
    'echo "parent"'
  ]);
});

test("parseWorkflowInformation without matrix definition", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
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
    "projectx",
    "build-chain",
    "flow-matrix.yaml",
    "defaultGroup",
    context.config.matrixVariables,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
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
      "projectx",
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

test("parseWorkflowInformation without matrix definition and with archive-artifacts", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifacts.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
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
    },
    archiveArtifacts: {
      name: "namex",
      paths: "pathsx",
      ifNoFilesFound: "warn"
    }
  };
  expect(expected).toEqual(buildChainInformation);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts no name and ifNoFilesFound", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifactsnoname.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
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
    },
    archiveArtifacts: {
      name: "artifact",
      paths: "pathsx",
      ifNoFilesFound: "warn"
    }
  };
  expect(expected).toEqual(buildChainInformation);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts multiline", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-multiline.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
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
    },
    archiveArtifacts: {
      name: "namex",
      paths: `path/output/bin/
path/output/test-results
!path/**/*.tmp
`,
      ifNoFilesFound: "warn"
    }
  };
  expect(buildChainInformation).toEqual(expected);
});
