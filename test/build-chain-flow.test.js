const { start, treatParents } = require("../src/lib/build-chain-flow");
const {
  checkouProject,
  checkoutDependencies,
  getDir,
  readWorkflowInformation
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/build-chain-flow-helper");
const { execute } = require("../src/lib/command");
jest.mock("../src/lib/command");
jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

test("start", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup",
        project: "projectX",
        sourceBranch: "sBranch",
        targetBranch: "tBranch"
      },
      rootFolder: "folder"
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command 1", "command 2"],
    buildCommandsUpstream: ["upstream 1", "upstream 2"],
    buildCommandsDownstream: ["downstream 1", "downstream 2"]
  };
  readWorkflowInformation.mockReturnValueOnce(workflowInformation);
  getDir.mockReturnValueOnce("folder/projectX");

  // Act
  await start(context);
  // Assert
  expect(checkouProject).toHaveBeenCalledWith(context, "projectX", {
    group: "defaultGroup"
  });
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "job-id",
    "main.yaml",
    "defaultGroup"
  );
  expect(readWorkflowInformation).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith("folder/projectX", "command 1");
  expect(execute).toHaveBeenCalledWith("folder/projectX", "command 2");
  expect(execute).toHaveBeenCalledTimes(2);
});

test("treatParents", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup"
      },
      rootFolder: "folder"
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command 1", "command 2"],
    buildCommandsUpstream: ["upstream 1", "upstream 2"],
    buildCommandsDownstream: ["downstream 1", "downstream 2"],
    childDependencies: {
      projectB: { mapping: { source: "7.x", target: "master" } },
      projectC: {}
    },
    parentDependencies: { projectD: {} }
  };
  // Act
  await treatParents(context, [], "projectA", workflowInformation);
  // Assert
  expect(checkoutDependencies).toHaveBeenCalledWith(context, { projectD: {} });
  expect(getDir).toHaveBeenCalledWith("folder", "projectD");
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "job-id",
    "main.yaml",
    "defaultGroup",
    undefined
  );
});

test("treatParents no rootFolder", async () => {
  // Arrange
  const context = {
    config: {
      github: {
        jobName: "job-id",
        workflow: "main.yaml",
        group: "defaultGroup"
      },
      rootFolder: undefined
    }
  };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command 1", "command 2"],
    buildCommandsUpstream: ["upstream 1", "upstream 2"],
    buildCommandsDownstream: ["downstream 1", "downstream 2"],
    childDependencies: {
      projectB: { mapping: { source: "7.x", target: "master" } },
      projectC: {}
    },
    parentDependencies: { projectD: {} }
  };
  // Act
  await treatParents(context, [], "projectA", workflowInformation);
  // Assert
  expect(checkoutDependencies).toHaveBeenCalledWith(context, { projectD: {} });
  expect(getDir).toHaveBeenCalledWith(undefined, "projectD");
  expect(readWorkflowInformation).toHaveBeenCalledWith(
    "job-id",
    "main.yaml",
    "defaultGroup",
    undefined
  );
});
