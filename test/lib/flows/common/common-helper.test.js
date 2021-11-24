const {
  executeBuild,
  executeBuildSpecificCommand,
  getExecutionResultError
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
jest.mock("../../../../src/lib/common");

jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

describe("executeBuild", () => {
  test("only current commands", async () => {
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
    const result = await executeBuild("folder", nodeChain, "b");

    // Assert
    expect(treatCommand).toHaveBeenCalledTimes(3);
    expect(treatCommand).toHaveBeenCalledWith("a command", {});
    expect(treatCommand).toHaveBeenCalledWith("b command", {});
    expect(treatCommand).toHaveBeenCalledWith("c command", {});
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenCalledWith("a_folder", "a command treated");
    expect(execute).toHaveBeenCalledWith("b_folder", "b command treated");
    expect(execute).toHaveBeenCalledWith("c_folder", "c command treated");
    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "ok" },
      { project: "c", result: "ok" }
    ]);
    expect(typeof result[0].time).toBe("number");
    expect(typeof result[1].time).toBe("number");
    expect(typeof result[2].time).toBe("number");
  });

  test("upstream commands", async () => {
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
    const result = await executeBuild("folder", nodeChain, "b");

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
    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "ok" },
      { project: "c", result: "ok" }
    ]);
  });

  test("upstream/downstream commands", async () => {
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
    const result = await executeBuild("folder", nodeChain, "b");

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
    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "ok" },
      { project: "c", result: "ok" }
    ]);
  });

  test("skip", async () => {
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
    const result = await executeBuild("folder", nodeChain, "b");

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
    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "skipped" },
      { project: "c", result: "ok" }
    ]);
  });

  test("nodeChain not containing project triggering the job", async () => {
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
      const result = await executeBuild("folder", nodeChain, "projectx");
      expect(result).toEqual(false);
    } catch (ex) {
      expect(ex.message).toBe(
        `The chain ${nodeChain.map(
          node => node.project
        )} does not contain the project triggering the job projectx`
      );
    }
  });

  test("exception", async () => {
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
    execute
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("Mock error executing command"));

    // Act
    const result = await executeBuild("folder", nodeChain, "c");
    expect(result.length).toBe(2);
    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      {
        project: "b",
        result: "error"
      }
    ]);
  });

  test("only current commands with options", async () => {
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
    const result = await executeBuild("folder", nodeChain, "b", {
      optionx: "awesome option"
    });

    // Assert
    expect(treatCommand).toHaveBeenCalledTimes(3);
    expect(treatCommand).toHaveBeenCalledWith("a command", {
      optionx: "awesome option"
    });
    expect(treatCommand).toHaveBeenCalledWith("b command", {
      optionx: "awesome option"
    });
    expect(treatCommand).toHaveBeenCalledWith("c command", {
      optionx: "awesome option"
    });
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenCalledWith("a_folder", "a command treated");
    expect(execute).toHaveBeenCalledWith("b_folder", "b command treated");
    expect(execute).toHaveBeenCalledWith("c_folder", "c command treated");

    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "ok" },
      { project: "c", result: "ok" }
    ]);
  });
});

describe("executeBuildSpecificCommand", () => {
  test("ok", async () => {
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
    const result = await executeBuildSpecificCommand(
      "folder",
      nodeChain,
      "command x"
    );

    // Assert
    expect(treatCommand).toHaveBeenCalledTimes(3);
    expect(treatCommand).toHaveBeenCalledWith("command x", {});
    expect(treatCommand).toHaveBeenCalledWith("command x", {});
    expect(treatCommand).toHaveBeenCalledWith("command x", {});
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenCalledWith("a_folder", "command x treated");
    expect(execute).toHaveBeenCalledWith("b_folder", "command x treated");
    expect(execute).toHaveBeenCalledWith("c_folder", "command x treated");

    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "ok" },
      { project: "c", result: "ok" }
    ]);
  });

  test("exception", async () => {
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
    getDir.mockReturnValueOnce("a_folder").mockReturnValueOnce("b_folder");

    execute
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("Mock error executing command"));

    // Act
    const result = await executeBuildSpecificCommand(
      "folder",
      nodeChain,
      "command x"
    );

    // Assert
    expect(treatCommand).toHaveBeenCalledTimes(2);
    expect(treatCommand).toHaveBeenCalledWith("command x", {});
    expect(treatCommand).toHaveBeenCalledWith("command x", {});
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledWith("a_folder", "command x treated");
    expect(execute).toHaveBeenCalledWith("b_folder", "command x treated");

    expect(result).toMatchObject([
      { project: "a", result: "ok" },
      { project: "b", result: "error" }
    ]);
  });
});

describe("getExecutionResultError", () => {
  test("all ok", () => {
    // Arrange
    const executionResult = [
      { project: "a", result: "ok" },
      { project: "b", result: "ok" },
      { project: "c", result: "ok" }
    ];

    // Act
    const result = getExecutionResultError(executionResult);

    // Assert
    expect(result).toBe(undefined);
  });

  test("all skipped", () => {
    // Arrange
    const executionResult = [
      { project: "a", result: "skipped" },
      { project: "b", result: "skipped" },
      { project: "c", result: "skipped" }
    ];

    // Act
    const result = getExecutionResultError(executionResult);

    // Assert
    expect(result).toBe(undefined);
  });

  test("all error", () => {
    // Arrange
    const executionResult = [
      { project: "a", result: "error" },
      { project: "b", result: "error" },
      { project: "c", result: "error" }
    ];

    // Act
    const result = getExecutionResultError(executionResult);

    // Assert
    expect(result).toStrictEqual({ project: "a", result: "error" });
  });

  test("any error", () => {
    // Arrange
    const executionResult = [
      { project: "a", result: "ok" },
      { project: "b", result: "skipped" },
      { project: "c", result: "error" }
    ];

    // Act
    const result = getExecutionResultError(executionResult);

    // Assert
    expect(result).toStrictEqual({ project: "c", result: "error" });
  });
});
