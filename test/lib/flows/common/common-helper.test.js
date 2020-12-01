const {
  executeBuild,
  executeBuildSpecificCommand
} = require("../../../../src/lib/flows/common/common-helper");
const {
  getDir
} = require("../../../../src/lib/flows/common/build-chain-flow-helper");
jest.mock("../../../../src/lib/flows/common/build-chain-flow-helper");

const {
  treatCommand
} = require("../../../../src/lib/command/treatment/command-treatment-delegator");
jest.mock("../../../../src/lib/command/treatment/command-treatment-delegator");
treatCommand.mockImplementation(param => `${param} treated`);

const { execute } = require("../../../../src/lib/command/command");
jest.mock("../../../../src/lib/command/command");

jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

test("executeBuild only current commands", async () => {
  // Arrange
  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": { current: "a command" }
      }
    },
    {
      project: "b",
      build: {
        "build-command": { current: "b command" }
      }
    },
    {
      project: "c",
      build: {
        "build-command": { current: "c command" }
      }
    }
  ];
  getDir
    .mockReturnValueOnce("a_folder")
    .mockReturnValueOnce("b_folder")
    .mockReturnValueOnce("c_folder");

  // Act
  await executeBuild("folder", nodeChain, "b");

  // Assert
  expect(treatCommand).toHaveBeenCalledTimes(3);
  expect(treatCommand).toHaveBeenCalledWith("a command", {});
  expect(treatCommand).toHaveBeenCalledWith("b command", {});
  expect(treatCommand).toHaveBeenCalledWith("c command", {});
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith("a_folder", "a command treated");
  expect(execute).toHaveBeenCalledWith("b_folder", "b command treated");
  expect(execute).toHaveBeenCalledWith("c_folder", "c command treated");
});

test("executeBuild upstream commands", async () => {
  // Arrange
  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": {
          current: "a command",
          upstream: "a upstream command"
        }
      }
    },
    {
      project: "b",
      build: {
        "build-command": {
          current: "b command",
          upstream: "b upstream command"
        }
      }
    },
    {
      project: "c",
      build: {
        "build-command": {
          current: "c command",
          upstream: "c upstream command"
        }
      }
    }
  ];
  getDir
    .mockReturnValueOnce("a_folder")
    .mockReturnValueOnce("b_folder")
    .mockReturnValueOnce("c_folder");

  // Act
  await executeBuild("folder", nodeChain, "b");

  // Assert
  expect(treatCommand).toHaveBeenCalledTimes(3);
  expect(treatCommand).toHaveBeenCalledWith("a upstream command", {});
  expect(treatCommand).toHaveBeenCalledWith("b command", {});
  expect(treatCommand).toHaveBeenCalledWith("c command", {});
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith(
    "a_folder",
    "a upstream command treated"
  );
  expect(execute).toHaveBeenCalledWith("b_folder", "b command treated");
  expect(execute).toHaveBeenCalledWith("c_folder", "c command treated");
});

test("executeBuild upstream/downstream commands", async () => {
  // Arrange
  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": {
          current: "a command",
          upstream: "a upstream command",
          downstream: "a downstream command"
        }
      }
    },
    {
      project: "b",
      build: {
        "build-command": {
          current: "b command",
          upstream: "b upstream command",
          downstream: "b downstream command"
        }
      }
    },
    {
      project: "c",
      build: {
        "build-command": {
          current: "c command",
          upstream: "c upstream command",
          downstream: "c downstream command"
        }
      }
    }
  ];
  getDir
    .mockReturnValueOnce("a_folder")
    .mockReturnValueOnce("b_folder")
    .mockReturnValueOnce("c_folder");

  // Act
  await executeBuild("folder", nodeChain, "b");

  // Assert
  expect(treatCommand).toHaveBeenCalledTimes(3);
  expect(treatCommand).toHaveBeenCalledWith("a upstream command", {});
  expect(treatCommand).toHaveBeenCalledWith("b command", {});
  expect(treatCommand).toHaveBeenCalledWith("c downstream command", {});
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith(
    "a_folder",
    "a upstream command treated"
  );
  expect(execute).toHaveBeenCalledWith("b_folder", "b command treated");
  expect(execute).toHaveBeenCalledWith(
    "c_folder",
    "c downstream command treated"
  );
});

test("executeBuild skip", async () => {
  // Arrange
  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": {
          current: "a command",
          upstream: "a upstream command",
          downstream: "a downstream command"
        }
      }
    },
    {
      project: "b",
      build: {
        "build-command": {
          current: "b command",
          upstream: "b upstream command",
          downstream: "b downstream command"
        },
        skip: true
      }
    },
    {
      project: "c",
      build: {
        "build-command": {
          current: "c command",
          upstream: "c upstream command",
          downstream: "c downstream command"
        },
        skip: false
      }
    }
  ];
  getDir.mockReturnValueOnce("a_folder").mockReturnValueOnce("c_folder");

  // Act
  await executeBuild("folder", nodeChain, "b");

  // Assert
  expect(treatCommand).toHaveBeenCalledTimes(2);
  expect(treatCommand).toHaveBeenCalledWith("a upstream command", {});
  expect(treatCommand).toHaveBeenCalledWith("c downstream command", {});
  expect(execute).toHaveBeenCalledTimes(2);
  expect(execute).toHaveBeenCalledWith(
    "a_folder",
    "a upstream command treated"
  );
  expect(execute).toHaveBeenCalledWith(
    "c_folder",
    "c downstream command treated"
  );
});

test("executeBuildSpecificCommand", async () => {
  // Arrange
  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": {
          current: "a command",
          upstream: "a upstream command",
          downstream: "a downstream command"
        }
      }
    },
    {
      project: "b",
      build: {
        "build-command": {
          current: "b command",
          upstream: "b upstream command",
          downstream: "b downstream command"
        }
      }
    },
    {
      project: "c",
      build: {
        "build-command": {
          current: "c command",
          upstream: "c upstream command",
          downstream: "c downstream command"
        }
      }
    }
  ];
  getDir
    .mockReturnValueOnce("a_folder")
    .mockReturnValueOnce("b_folder")
    .mockReturnValueOnce("c_folder");

  // Act
  await executeBuildSpecificCommand("folder", nodeChain, "command x");

  // Assert
  expect(treatCommand).toHaveBeenCalledTimes(3);
  expect(treatCommand).toHaveBeenCalledWith("command x", {});
  expect(treatCommand).toHaveBeenCalledWith("command x", {});
  expect(treatCommand).toHaveBeenCalledWith("command x", {});
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith("a_folder", "command x treated");
  expect(execute).toHaveBeenCalledWith("b_folder", "command x treated");
  expect(execute).toHaveBeenCalledWith("c_folder", "command x treated");
});

test("executeBuild nodeChain not containing project triggering the job", async () => {
  // Arrange

  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": { current: "a command" }
      }
    },
    {
      project: "b",
      build: {
        "build-command": { current: "b command" }
      }
    },
    {
      project: "c",
      build: {
        "build-command": { current: "c command" }
      }
    }
  ];

  // Act
  try {
    await executeBuild("folder", nodeChain, "projectx");
    expect(true).toEqual(false);
  } catch (ex) {
    expect(ex.message).toBe(
      `The chain ${nodeChain.map(
        node => node.project
      )} does not contain the project triggering the job projectx`
    );
  }
});

test("executeBuild only current commands with options", async () => {
  // Arrange
  const nodeChain = [
    {
      project: "a",
      build: {
        "build-command": { current: "a command" }
      }
    },
    {
      project: "b",
      build: {
        "build-command": { current: "b command" }
      }
    },
    {
      project: "c",
      build: {
        "build-command": { current: "c command" }
      }
    }
  ];
  getDir
    .mockReturnValueOnce("a_folder")
    .mockReturnValueOnce("b_folder")
    .mockReturnValueOnce("c_folder");

  // Act
  await executeBuild("folder", nodeChain, "b", {
    concatCommand: "awesome concat"
  });

  // Assert
  expect(treatCommand).toHaveBeenCalledTimes(3);
  expect(treatCommand).toHaveBeenCalledWith("a command", {
    concatCommand: "awesome concat"
  });
  expect(treatCommand).toHaveBeenCalledWith("b command", {
    concatCommand: "awesome concat"
  });
  expect(treatCommand).toHaveBeenCalledWith("c command", {
    concatCommand: "awesome concat"
  });
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute).toHaveBeenCalledWith("a_folder", "a command treated");
  expect(execute).toHaveBeenCalledWith("b_folder", "b command treated");
  expect(execute).toHaveBeenCalledWith("c_folder", "c command treated");
});
