const {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation,
  dependenciesToObject
} = require("../src/lib/workflow-informaton-reader");
jest.mock("../src/lib/git");
jest.mock("@actions/core");
const {
  getDir,
  checkoutDependencies
} = require("../src/lib/build-chain-flow-helper");
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
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = [];
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile
    }
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
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = [];

  checkoutDependencies.mockResolvedValueOnce({
    "parent-parent": { targetBranch: context.config.github.targetBranch }
  });
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile,
      parentDependencies: { "parent-parent": { group: "groupX" } }
    }
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
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = [];
  checkoutDependencies
    .mockResolvedValueOnce({
      parent: { targetBranch: context.config.github.targetBranch }
    })
    .mockResolvedValueOnce({
      "parent-parent": { targetBranch: context.config.github.targetBranch }
    });
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile,
      parentDependencies: { parent: { group: "groupX" } }
    }
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
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = [];
  checkoutDependencies
    .mockResolvedValueOnce({
      child: { targetBranch: context.config.github.targetBranch }
    })
    .mockResolvedValueOnce({
      parent: { targetBranch: context.config.github.targetBranch }
    })
    .mockResolvedValueOnce({
      "parent-parent": { targetBranch: context.config.github.targetBranch }
    });
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile,
      parentDependencies: { child: { group: "groupX" } }
    }
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
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = ["parent-parent"];
  checkoutDependencies
    .mockResolvedValueOnce({
      child: { targetBranch: context.config.github.targetBranch }
    })
    .mockResolvedValueOnce({
      parent: { targetBranch: context.config.github.targetBranch }
    });
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile,
      parentDependencies: { child: { group: "groupX" } }
    }
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

test("checkoutParentsAndGetWorkflowInformation flowFile and jobId", async () => {
  // Arrange
  getDir.mockReturnValueOnce("./test/resources/hierarchyflows/parent-parent");
  const project = "parent";

  const context = {
    config: {
      github: {
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = [];

  checkoutDependencies.mockResolvedValueOnce({
    "parent-parent": { targetBranch: context.config.github.targetBranch }
  });
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile,
      parentDependencies: { "parent-parent": { group: "groupX" } }
    }
  );

  // Assert
  expect(workflowInformationArray.length).toBe(1);
  expect(workflowInformationArray[0].project).toBe("parent-parent");
  expect(workflowInformationArray[0].buildCommands).toStrictEqual([
    'echo "parent-parent"'
  ]);
});

test("checkoutParentsAndGetWorkflowInformation 2 levels flowFile and jobId", async () => {
  // Arrange
  getDir
    .mockReturnValueOnce("./test/resources/hierarchyflows-flowFileJobId/parent")
    .mockReturnValueOnce(
      "./test/resources/hierarchyflows-flowFileJobId/parent-parent"
    );
  const project = "child";
  const context = {
    config: {
      github: {
        jobId: "build-chain",
        flowFile: "flow.yaml",
        group: "groupX",
        project: project,
        targetBranch: "tBranch"
      }
    }
  };

  const projectList = [];
  checkoutDependencies
    .mockResolvedValueOnce({
      parent: { targetBranch: context.config.github.targetBranch }
    })
    .mockResolvedValueOnce({
      "parent-parent": { targetBranch: context.config.github.targetBranch }
    });
  // Act
  const workflowInformationArray = await checkoutParentsAndGetWorkflowInformation(
    context,
    projectList,
    project,
    context.config.github.targetBranch,
    {
      jobId: context.config.github.jobId,
      flowFile: context.config.github.flowFile,
      parentDependencies: {
        parent: { group: "groupX", flowFile: "flowx.yaml" }
      }
    }
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
    jobId: "build-chain",
    flowFile: "flow.yaml",
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
      dependencies: "none"
    }
  };
  expect(buildChainInformation).toEqual(expected);
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
    jobId: "build-chain",
    flowFile: "flow-matrix.yaml",
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
    },
    archiveArtifacts: {
      dependencies: "none"
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
    jobId: "build-chain",
    flowFile: "flow-archiveartifacts.yaml",
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
      path: "pathsx",
      ifNoFilesFound: "warn",
      dependencies: "none"
    }
  };
  expect(buildChainInformation).toEqual(expected);
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
    jobId: "build-chain",
    flowFile: "flow-archiveartifactsnoname.yaml",
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
      name: "projectx",
      path: "pathsx",
      ifNoFilesFound: "warn",
      dependencies: "none"
    }
  };
  expect(buildChainInformation).toEqual(expected);
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
    jobId: "build-chain",
    flowFile: "flow-multiline.yaml",
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
      path: `path/output/bin/
path/output/test-results
!path/**/*.tmp
`,
      ifNoFilesFound: "warn",
      dependencies: "none"
    }
  };
  expect(buildChainInformation).toEqual(expected);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts dependencies none", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifactsdependenciesnone.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
    name: "Build Chain",
    jobId: "build-chain",
    flowFile: "flow-archiveartifactsdependenciesnone.yaml",
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
      name: "projectx",
      path: "pathsx",
      ifNoFilesFound: "warn",
      dependencies: "none"
    }
  };
  expect(buildChainInformation).toEqual(expected);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts dependencies all", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifactsdependenciesall.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
    name: "Build Chain",
    jobId: "build-chain",
    flowFile: "flow-archiveartifactsdependenciesall.yaml",
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
      name: "projectx",
      path: "pathsx",
      ifNoFilesFound: "warn",
      dependencies: "all"
    }
  };
  expect(buildChainInformation).toEqual(expected);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts dependencies multiline", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifactsdependenciesmultiline.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
    name: "Build Chain",
    jobId: "build-chain",
    flowFile: "flow-archiveartifactsdependenciesmultiline.yaml",
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
      name: "projectx",
      path: "pathsx",
      ifNoFilesFound: "warn",
      dependencies: ["projectA", "none", "all", "projectB"]
    }
  };
  expect(buildChainInformation).toEqual(expected);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts dependencies singleline", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifactsdependenciessingleline.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
    name: "Build Chain",
    jobId: "build-chain",
    flowFile: "flow-archiveartifactsdependenciessingleline.yaml",
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
      name: "projectx",
      path: "pathsx",
      ifNoFilesFound: "warn",
      dependencies: ["projectA"]
    }
  };
  expect(buildChainInformation).toEqual(expected);
});

test("parseWorkflowInformation without matrix definition and with archive-artifacts dependencies no path", () => {
  // Act
  const buildChainInformation = readWorkflowInformation(
    "projectx",
    "build-chain",
    "flow-archiveartifactsdependenciesnopath.yaml",
    "defaultGroup",
    undefined,
    "test/resources"
  );
  // Assert
  const expected = {
    id: "build-chain",
    project: "projectx",
    name: "Build Chain",
    jobId: "build-chain",
    flowFile: "flow-archiveartifactsdependenciesnopath.yaml",
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
      dependencies: ["projectA"]
    }
  };
  expect(buildChainInformation).toEqual(expected);
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

test("dependenciesToObject single", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "defaultGroup"
    }
  };
  // Act
  const dependencies = dependenciesToObject(`projectA`, "defaultGroup");
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single with group", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "groupx"
    }
  };
  // Act
  const dependencies = dependenciesToObject(`groupx/projectA`, "defaultGroup");
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single with mapping", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "defaultGroup",
      mapping: { source: "7.x", target: "master" }
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA@7.x:master`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single with group and mapping", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "groupx",
      mapping: { source: "7.x", target: "master" }
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `groupx/projectA@7.x:master`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single with flow file", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "defaultGroup",
      flowFile: "file37-x.yml"
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA|file37-x.yml`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single with group, mapping and flow file", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "groupx",
      mapping: { source: "7.x", target: "master" },
      flowFile: "file37-x.yml"
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `groupx/projectA@7.x:master|file37-x.yml`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single with job id", () => {
  // Arrange
  const expected = {
    projectA: {
      group: "defaultGroup",
      jobId: "job39-x-8whatever"
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA|:job39-x-8whatever`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});
