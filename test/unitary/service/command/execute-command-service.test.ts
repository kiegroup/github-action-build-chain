import "reflect-metadata";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { defaultNodeValue } from "@bc/domain/node";
import { NodeExecutionLevel } from "@bc/domain/node-execution";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { Node } from "@kie/build-chain-configuration-reader";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";

// disable logs
jest.spyOn(global.console, "log");
jest.mock("@bc/service/logger/base-logger-service");
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