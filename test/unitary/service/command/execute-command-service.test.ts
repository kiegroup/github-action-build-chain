import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { defaultValue as nodeDefaultValue, Node } from "@bc/domain/node";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";
import { TestLoggerService } from "@bc/service/logger/__mocks__/test-logger-service";
import { ConfigurationService } from "@bc/service/config/configuration-service";

jest.mock("@bc/service/logger/logger-service-factory");
jest.mock("@bc/service/command/treatment/command-treatment-delegator");
jest.mock("@bc/service/command/executor/command-executor-delegator");
jest.mock("@bc/service/config/configuration-service");

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
    const executeCommandResultPromise = await executeCommandService.executeCommand("command X", "cwd");

    // Assert
    expect(executeCommandResultPromise).toStrictEqual({ result: ExecutionResult.OK });
    expect(CommandTreatmentDelegator.prototype.treatCommand).toHaveBeenCalledTimes(1);
    expect(CommandTreatmentDelegator.prototype.treatCommand).toHaveBeenCalledWith("command X", "treatmentOptions");
    expect(CommandExecutorDelegator.prototype.executeCommand).toHaveBeenCalledTimes(1);
    expect(CommandExecutorDelegator.prototype.executeCommand).toHaveBeenCalledWith("command x treated", "cwd");
  });
});

describe("executeChainCommands", () => {

  const nodes: Node[] = [{
    ...nodeDefaultValue,
    project: "project1",
    before: {
      upstream: ["project1 before upstream 1"],
      current: ["project1 before current 1", "project1 before current 2"],
      downstream: ["project1 before downstream 1", "project1 before downstream 2", "project1 before downstream 3"],
    },
    commands: {
      upstream: ["project1 commands upstream 1"],
      current: ["project1 commands current 1", "project1 commands current 2"],
      downstream: ["project1 commands downstream 1", "project1 commands downstream 2", "project1 commands downstream 3"],
    },
    after: {
      upstream: ["project1 after upstream 1"],
      current: ["project1 after current 1", "project1 after current 2"],
      downstream: ["project1 after downstream 1", "project1 after downstream 2", "project1 after downstream 3"],
    },
  }, {
    ...nodeDefaultValue,
    project: "project2",
    before: {
      upstream: ["project2 before upstream 1"],
      current: ["project2 before current 1", "project2 before current 2"],
      downstream: ["project2 before downstream 1", "project2 before downstream 2", "project2 before downstream 3"],
    },
    commands: {
      upstream: ["project2 commands upstream 1"],
      current: ["project2 commands current 1", "project2 commands current 2"],
      downstream: ["project2 commands downstream 1", "project2 commands downstream 2", "project2 commands downstream 3"],
    },
    after: {
      upstream: ["project2 after upstream 1"],
      current: ["project2 after current 1", "project2 after current 2"],
      downstream: ["project2 after downstream 1", "project2 after downstream 2", "project2 after downstream 3"],
    },
  }, {
    ...nodeDefaultValue,
    project: "project3",
    before: {
      upstream: [],
      current: ["project3 before current 1"],
      downstream: [],
    },
    commands: {
      upstream: [],
      current: ["project3 commands current 1", "project3 commands current 2"],
      downstream: [],
    },
    after: {
      upstream: [],
      current: ["project3 after current 1", "project3 after current 2", "project3 after current 3"],
      downstream: [],
    },
  }, {
    ...nodeDefaultValue,
    project: "project4",
  }, {
    ...nodeDefaultValue,
    project: "project5",
    before: {
      upstream: [],
      current: [],
      downstream: [],
    },
    commands: {
      upstream: [],
      current: [],
      downstream: [],
    },
    after: {
      upstream: [],
      current: [],
      downstream: [],
    },
  },
  ];

  test("empty nodes", async () => {
    // Arrange
    const executionPhase: ExecutionPhase = ExecutionPhase.AFTER;

    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = new ConfigurationService();

    const executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);

    // Act
    const result = await executeCommandService.executeChainCommands([], executionPhase);

    // Arrange
    expect(result).toStrictEqual([]);
  });

  test.each([
    [ExecutionPhase.BEFORE, NodeExecutionLevel.UPSTREAM, false, undefined, [[{ command: "project1 before upstream 1" }], [{ command: "project2 before upstream 1" }], [{ command: "project3 before current 1" }]]],
    [ExecutionPhase.BEFORE, NodeExecutionLevel.UPSTREAM, false, "whateverThePath", [[{
      command: "project1 before upstream 1",
      cwd: "whateverThePath",
    }], [{ command: "project2 before upstream 1", cwd: "whateverThePath" }], [{
      command: "project3 before current 1",
      cwd: "whateverThePath",
    }]]],
    [ExecutionPhase.BEFORE, NodeExecutionLevel.CURRENT, false, undefined, [[{ command: "project1 before current 1" }, { command: "project1 before current 2" }], [{ command: "project2 before current 1" }, { command: "project2 before current 2" }], [{ command: "project3 before current 1" }]]],
    [ExecutionPhase.BEFORE, NodeExecutionLevel.DOWNSTREAM, false, undefined, [[{ command: "project1 before downstream 1" }, { command: "project1 before downstream 2" }, { command: "project1 before downstream 3" }], [{ command: "project2 before downstream 1" }, { command: "project2 before downstream 2" }, { command: "project2 before downstream 3" }], [{ command: "project3 before current 1" }]]],
    [ExecutionPhase.CURRENT, NodeExecutionLevel.UPSTREAM, false, undefined, [[{ command: "project1 commands upstream 1" }], [{ command: "project2 commands upstream 1" }], [{ command: "project3 commands current 1" }, { command: "project3 commands current 2" }]]],
    [ExecutionPhase.CURRENT, NodeExecutionLevel.CURRENT, false, undefined, [[{ command: "project1 commands current 1" }, { command: "project1 commands current 2" }], [{ command: "project1 commands current 1" }, { command: "project1 commands current 2" }], [{ command: "project3 commands current 1" }, { command: "project3 commands current 2" }]]],
    [ExecutionPhase.CURRENT, NodeExecutionLevel.DOWNSTREAM, false, undefined, [[{ command: "project1 commands downstream 1" }, { command: "project1 commands downstream 2" }, { command: "project1 commands downstream 3" }], [{ command: "project2 commands downstream 1" }, { command: "project2 commands downstream 2" }, { command: "project2 commands downstream 3" }], [{ command: "project3 commands current 1" }, { command: "project3 commands current 2" }]]],
    [ExecutionPhase.AFTER, NodeExecutionLevel.UPSTREAM, false, undefined, [[{ command: "project1 after upstream 1" }], [{ command: "project2 after upstream 1" }], [{ command: "project3 after current 1" }, { command: "project3 after current 2" }, { command: "project3 after current 3" }]]],
    [ExecutionPhase.AFTER, NodeExecutionLevel.CURRENT, false, undefined, [[{ command: "project1 after current 1" }, { command: "project1 after current 2" }], [{ command: "project2 after current 1" }, { command: "project2 after current 2" }], [{ command: "project3 after current 1" }, { command: "project3 after current 2" }, { command: "project3 after current 3" }]]],
    [ExecutionPhase.AFTER, NodeExecutionLevel.DOWNSTREAM, false, undefined, [[{ command: "project1 after downstream 1" }, { command: "project1 after downstream 2" }, { command: "project1 after downstream 3" }], [{ command: "project2 after downstream 1" }, { command: "project2 after downstream 2" }, { command: "project2 after downstream 3" }], [{ command: "project3 after current 1" }, { command: "project3 after current 2" }, { command: "project3 after current 3" }]]],
    [ExecutionPhase.AFTER, NodeExecutionLevel.DOWNSTREAM, false, undefined, [[{ command: "project1 after downstream 1" }, { command: "project1 after downstream 2" }, { command: "project1 after downstream 3" }], [{ command: "project2 after downstream 1" }, { command: "project2 after downstream 2" }, { command: "project2 after downstream 3" }], [{ command: "project3 after current 1" }, { command: "project3 after current 2" }, { command: "project3 after current 3" }]]],
  ])("nodes. %p %p skipExecution %p", async (executionPhase: ExecutionPhase, nodeExecutionLevel: NodeExecutionLevel, skipExecution: boolean, cwd: string | undefined, expectedCalls: ({ command: string, cwd?: string })[][]) => {
    // Arrange
    const commandTreatmentDelegator = jest.mocked<CommandTreatmentDelegator>(CommandTreatmentDelegator.prototype, true);
    const commandExecutorDelegator = jest.mocked<CommandExecutorDelegator>(CommandExecutorDelegator.prototype, true);
    const configurationService = jest.mocked<ConfigurationService>(ConfigurationService.prototype, true);
    (CommandExecutorDelegator.prototype.executeCommand as jest.Mocked<jest.Mock>).mockResolvedValue({
      startingDate: 1,
      endingDate: 2,
      time: 3,
      result: ExecutionResult.OK,
      command: "commandx",
    });
    (ConfigurationService.prototype.getNodeExecutionLevel as jest.Mocked<jest.Mock>).mockReturnValue(nodeExecutionLevel);
    (ConfigurationService.prototype.getNodeExecutionLevel as jest.Mocked<jest.Mock>).mockReturnValue(nodeExecutionLevel);
    (ConfigurationService.prototype.skipExecution as jest.Mocked<jest.Mock>).mockReturnValue(skipExecution);

    const expectedNumberOfCalls = skipExecution ? 0 : expectedCalls.reduce((length: number, calls: ({ command: string, cwd?: string })[]) => length + calls.length, 0);

    const executeCommandService = new ExecuteCommandService(commandTreatmentDelegator, commandExecutorDelegator, configurationService);

    // Act
    const result = await executeCommandService.executeChainCommands(nodes, executionPhase, cwd);

    // Assert
    expect(commandExecutorDelegator.executeCommand).toHaveBeenCalledTimes(expectedNumberOfCalls);
    expect(commandTreatmentDelegator.treatCommand).toHaveBeenCalledTimes(expectedNumberOfCalls);
    if (!skipExecution) {
      expectedCalls.forEach(node => node.forEach(call => expect(commandTreatmentDelegator.treatCommand).toHaveBeenCalledWith(call.command, undefined)));
      expectedCalls.forEach(node => node.forEach(call => expect(commandExecutorDelegator.executeCommand).toHaveBeenCalledWith(undefined, call.cwd)));
    }
    expect(TestLoggerService.prototype.debug).toHaveBeenCalledTimes(2);
    expect(TestLoggerService.prototype.debug).toHaveBeenCalledWith(`No commands defined for project project4 and phase ${executionPhase}`);
    expect(TestLoggerService.prototype.debug).toHaveBeenCalledWith(`No commands defined for project project5 phase ${executionPhase} and level ${nodeExecutionLevel !== NodeExecutionLevel.CURRENT ? `${nodeExecutionLevel} or ${NodeExecutionLevel.CURRENT}` : NodeExecutionLevel.CURRENT}`);

    const expectedResult = nodes.map((node, index) => ({
      node, executeCommandResults: expectedCalls[index] ? skipExecution ? expectedCalls[index].map(ec => ({
        startingDate: expect.any(Number),
        endingDate: expect.any(Number),
        result: ExecutionResult.SKIP,
        command: ec.command,
      })) : expectedCalls[index].map(() => ({
        startingDate: 1,
        endingDate: 2,
        time: 3,
        result: ExecutionResult.OK,
        command: "commandx",
      })) : undefined,
    }));
    expect(result.map(r => r.executeCommandResults)).toStrictEqual(expectedResult.map(r => r.executeCommandResults));
  });
});