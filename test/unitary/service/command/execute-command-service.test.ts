import "reflect-metadata";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { defaultNodeValue } from "@bc/domain/node";
import { NodeExecution, NodeExecutionLevel } from "@bc/domain/node-execution";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { Node } from "@kie/build-chain-configuration-reader";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { Logger } from "@bc/service/logger/logger";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";

// disable logs
jest.spyOn(global.console, "log");
jest.mock("@bc/service/command/treatment/command-treatment-delegator");
jest.mock("@bc/service/command/executor/command-executor-delegator");
jest.mock("@bc/service/config/configuration-service");

// entry point for logging doesn't make a difference
Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

describe("ExecuteCommandService", () => {
  test("executeCommand without cwd", async () => {
    // Arrange
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = new ConfigurationService();

    (ConfigurationService.prototype.getTreatmentOptions as jest.Mocked<jest.Mock>).mockReturnValueOnce("treatmentOptions");
    (CommandTreatmentDelegator.prototype.treatCommand as jest.Mocked<jest.Mock>).mockReturnValue("command x treated");
    (CommandExecutorDelegator.prototype.executeCommand as jest.Mocked<jest.Mock>).mockReturnValue({ result: ExecutionResult.OK });

    const executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);

    // Act
    const executeCommandResultPromise = await executeCommandService.executeCommand("command X");

    // Assert
    expect(executeCommandResultPromise).toStrictEqual({ result: ExecutionResult.OK });
    expect(CommandTreatmentDelegator.prototype.treatCommand).toHaveBeenCalledTimes(1);
    expect(CommandTreatmentDelegator.prototype.treatCommand).toHaveBeenCalledWith("command X", "treatmentOptions");
    expect(CommandExecutorDelegator.prototype.executeCommand).toHaveBeenCalledTimes(1);
    expect(CommandExecutorDelegator.prototype.executeCommand).toHaveBeenCalledWith("command x treated", undefined);
  });

  test("executeCommand with cwd", async () => {
    // Arrange
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = new ConfigurationService();

    (ConfigurationService.prototype.getTreatmentOptions as jest.Mocked<jest.Mock>).mockReturnValueOnce("treatmentOptions");
    (CommandTreatmentDelegator.prototype.treatCommand as jest.Mocked<jest.Mock>).mockReturnValue("command x treated");
    (CommandExecutorDelegator.prototype.executeCommand as jest.Mocked<jest.Mock>).mockReturnValue({ result: ExecutionResult.OK });

    const executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);

    // Act
    const executeCommandResultPromise = await executeCommandService.executeCommand("command X", { cwd: "cwd" });

    // Assert
    expect(executeCommandResultPromise).toStrictEqual({ result: ExecutionResult.OK });
    expect(CommandTreatmentDelegator.prototype.treatCommand).toHaveBeenCalledTimes(1);
    expect(CommandTreatmentDelegator.prototype.treatCommand).toHaveBeenCalledWith("command X", "treatmentOptions");
    expect(CommandExecutorDelegator.prototype.executeCommand).toHaveBeenCalledTimes(1);
    expect(CommandExecutorDelegator.prototype.executeCommand).toHaveBeenCalledWith("command x treated", {cwd: "cwd"});
  });
});

describe("executeNodeCommands", () => {
  test("empty nodes", async () => {
    // Arrange
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = new ConfigurationService();

    const executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);
    jest.spyOn(executeCommandService, "getNodeCommands").mockReturnValue(undefined);

    // Act
    const result = await executeCommandService.executeNodeCommands({node: defaultNodeValue});

    // Arrange
    expect(result).toStrictEqual([
      {node: defaultNodeValue, executeCommandResults: []},
      {node: defaultNodeValue, executeCommandResults: []},
      {node: defaultNodeValue, executeCommandResults: []}
    ]);
  });

  test.each([
    [NodeExecutionLevel.UPSTREAM, false, "cwd", ["upstream"], ["upstream", "", ""]],
    [NodeExecutionLevel.DOWNSTREAM, false, "cwd", ["downstream"], ["", "", "downstream"]],
    [NodeExecutionLevel.CURRENT, false, undefined, ["current"], ["", "current", ""]],
    [NodeExecutionLevel.CURRENT, true, undefined, [], ["", "current", ""]],
  ])("execute node %p skipExecution %p", async (nodeExecutionLevel: NodeExecutionLevel, skipExecution: boolean, cwd: string | undefined, expectedCalls: string[], expectedResult: string[]) => {
    const node: Node = {
      ...defaultNodeValue,
      project: "project1",
      before: {
        upstream: ["upstream"],
        current: [],
        downstream: [],
      },
      commands: {
        upstream: [],
        current: ["current"],
        downstream: [],
      },
      after: {
        upstream: [],
        current: [],
        downstream: ["downstream"],
      },
    };
  
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = jest.mocked<ConfigurationService>(ConfigurationService.prototype, true);
    (CommandExecutorDelegator.prototype.executeCommand as jest.Mocked<jest.Mock>).mockResolvedValue({
      startingDate: 1,
      endingDate: 2,
      time: 3,
      result: ExecutionResult.OK,
      command: "commandx",
      errorMessage: ""
    });
    (ConfigurationService.prototype.getNodeExecutionLevel as jest.Mocked<jest.Mock>).mockReturnValue(nodeExecutionLevel);
    (ConfigurationService.prototype.skipExecution as jest.Mocked<jest.Mock>).mockReturnValue(skipExecution);
    const executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);

    jest.spyOn(executeCommandService, "getNodeCommands").mockReturnValueOnce(node["before"]![`${nodeExecutionLevel}`]);
    jest.spyOn(executeCommandService, "getNodeCommands").mockReturnValueOnce(node["commands"]![`${nodeExecutionLevel}`]);
    jest.spyOn(executeCommandService, "getNodeCommands").mockReturnValueOnce(node["after"]![`${nodeExecutionLevel}`]);

    const result = await executeCommandService.executeNodeCommands({node, cwd});

    expect(commandExecutorDelegator.executeCommand).toHaveBeenCalledTimes(expectedCalls.length);
    expect(commandTreatmentDelegator.treatCommand).toHaveBeenCalledTimes(expectedCalls.length);
    expectedCalls.forEach(call => expect(commandTreatmentDelegator.treatCommand).toHaveBeenCalledWith(call, undefined));
    expectedCalls.forEach(_call => expect(commandExecutorDelegator.executeCommand).toHaveBeenCalledWith(undefined, { cwd }));
    expect(result.map(res => res.executeCommandResults)).toStrictEqual(
      expectedResult.map(res => (res !== "" ? [{
        startingDate: skipExecution ? expect.any(Number) : 1,
        endingDate: skipExecution ? expect.any(Number) : 2,
        time: skipExecution ? 0 : 3,
        result: skipExecution ? ExecutionResult.SKIP : ExecutionResult.OK,
        command: skipExecution ?  res : "commandx",
        errorMessage: ""
      }] : []))
    );
  });
});

describe("getNodeCommands", () => {
  let executeCommandService: ExecuteCommandService;

  beforeEach(() => {
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = jest.mocked<ConfigurationService>(ConfigurationService.prototype, true);
    executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);
  });

  test.each([
    [
      "execution phase defined but no commands found", 
      {
        current: [],
        upstream: [],
        downstream: []
      },
      NodeExecutionLevel.DOWNSTREAM,
      []
    ],
    [
      "execution phase defined but no commands for given level. use current", 
      {
        current: ["current"],
        upstream: [],
        downstream: []
      },
      NodeExecutionLevel.DOWNSTREAM,
      ["current"]
    ],
    [
      "execution phase defined and command for given level defined", 
      {
        current: [],
        upstream: ["upstream"],
        downstream: []
      },
      NodeExecutionLevel.UPSTREAM,
      ["upstream"]
    ],
    [
      "execution phase not defined", 
      undefined,
      NodeExecutionLevel.UPSTREAM,
      undefined
    ]
  ])("%p", (_title, after, nodeExecutionLevel, expectedOutput) => {
    const node: Node = {
      ...defaultNodeValue,
      after
    };
    const commands = executeCommandService.getNodeCommands(node, ExecutionPhase.AFTER, nodeExecutionLevel);
    expect(commands).toStrictEqual(expectedOutput);
  });
});

describe("executeNodeChain", () => {
  let executeCommandService: ExecuteCommandService;
  beforeEach(() => {
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = new ConfigurationService();
    jest.spyOn(BaseLoggerService.prototype, "logger", "get").mockImplementation(() => ({log: () => undefined, emptyLine: () => undefined}) as Logger);

    executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);
  });

  test.each([
    ["with print results", jest.fn((_node: ExecuteNodeResult[]) => undefined)],
    ["without print results", undefined]
  ])("sequential: %p", async (_title, printFn) => {
    jest.spyOn(ConfigurationService.prototype, "isParallelExecutionEnabled").mockReturnValueOnce(false);
    const execSpy = jest.spyOn(executeCommandService, "executeNodeCommands").mockResolvedValue([]);
    
    const nodeChain: NodeExecution[] = [
      {
        node: {
          ...defaultNodeValue,
          project: "project1"
        }
      },
      {
        node: {
          ...defaultNodeValue,
          project: "project2"
        }
      }
    ];

    await executeCommandService.executeNodeChain(nodeChain, printFn);
    expect(execSpy).toHaveBeenCalledTimes(2);
    if (printFn) {
      expect(printFn).toHaveBeenCalledTimes(2);
    }
  });

  test.each([
    ["with print results", jest.fn((_node: ExecuteNodeResult[]) => undefined)],
    ["without print results", undefined]
  ])("parallel: %p", async (_title, printFn) => {
    jest.spyOn(ConfigurationService.prototype, "isParallelExecutionEnabled").mockReturnValueOnce(true);
    const execSpy = jest.spyOn(executeCommandService, "executeNodeCommands").mockResolvedValue([]);
    const promiseSpy = jest.spyOn(Promise, "all");
    const nodeChain: NodeExecution[] = [
      {
        node: {
          ...defaultNodeValue,
          project: "project1",
          depth: 0
        }
      },
      {
        node: {
          ...defaultNodeValue,
          project: "project2",
          depth: 1
        }
      },
      {
        node: {
          ...defaultNodeValue,
          project: "project3",
          depth: 1
        }
      },
      {
        node: {
          ...defaultNodeValue,
          project: "project4",
          depth: 2
        }
      }
    ];

    await executeCommandService.executeNodeChain(nodeChain, printFn);
    expect(execSpy).toHaveBeenCalledTimes(4);
    if (printFn) {
      expect(printFn).toHaveBeenCalledTimes(4);
    }

    // check the number of arguments passed to Promise.all
    expect(promiseSpy.mock.calls[0][0].length).toBe(1);
    expect(promiseSpy.mock.calls[1][0].length).toBe(2);
    expect(promiseSpy.mock.calls[2][0].length).toBe(1);

    // first call to execSpy must be for the first node
    expect(execSpy.mock.calls[0][0]).toStrictEqual(nodeChain[0]);
    
    // the second and third execSpy must be for 2nd and 3rd node (can be in any order due to promises)
    expect([execSpy.mock.calls[1][0], execSpy.mock.calls[2][0]]).toContain(nodeChain[1]);
    expect([execSpy.mock.calls[1][0], execSpy.mock.calls[2][0]]).toContain(nodeChain[2]);
    
    // last call to execSpy must be for the last node
    expect(execSpy.mock.calls[3][0]).toStrictEqual(nodeChain[3]);
  });
});