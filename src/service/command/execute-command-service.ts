import Container, { Service } from "typedi";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { LoggerService } from "@bc/service/logger/logger-service";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { NodeExecution, NodeExecutionLevel } from "@bc/domain/node-execution";
import { Node } from "@kie/build-chain-configuration-reader";

@Service()
export class ExecuteCommandService {

  constructor(private _commandTreatmentDelegator: CommandTreatmentDelegator,
              private _commandExecutorDelegator: CommandExecutorDelegator,
              private _configurationService: ConfigurationService) {
  }

  public async executeCommand(command: string, cwd?: string): Promise<ExecuteCommandResult> {
    const treatedCommand = this._commandTreatmentDelegator.treatCommand(command, this._configurationService.getTreatmentOptions());
    return this._commandExecutorDelegator.executeCommand(treatedCommand, cwd);
  }

  public async executeNodeCommands(nodeToBeExecuted: NodeExecution): Promise<ExecuteNodeResult[]> {
    const result: ExecuteNodeResult[] = [];
    const {node, cwd} = nodeToBeExecuted;
    const before = this.getNodeCommands(node, ExecutionPhase.BEFORE, this._configurationService.getNodeExecutionLevel(node));
    const current = this.getNodeCommands(node, ExecutionPhase.CURRENT, this._configurationService.getNodeExecutionLevel(node));
    const after = this.getNodeCommands(node, ExecutionPhase.AFTER, this._configurationService.getNodeExecutionLevel(node));
    const skipExecution = this._configurationService.skipExecution(node);
    result.push(await this.executeCommands(node, before ?? [], skipExecution, cwd));
    result.push(await this.executeCommands(node, current ?? [], skipExecution, cwd));
    result.push(await this.executeCommands(node, after ?? [], skipExecution, cwd));
    return result;
  }

  public getNodeCommands(node: Node, executionPhase: ExecutionPhase, nodeExecutionLevel: NodeExecutionLevel): string[] | undefined {
    const commands = node[`${executionPhase}`];
    let levelCommands;
    if (commands) {
      levelCommands = commands[`${nodeExecutionLevel}`].length ? commands[`${nodeExecutionLevel}`] : commands[`${NodeExecutionLevel.CURRENT}`];
    }
    if (!commands) {
      Container.get(LoggerService).logger.debug(`No commands defined for project ${node.project} and phase ${executionPhase}`);
    } else if (!levelCommands || !levelCommands.length) {
      const levelMsg = nodeExecutionLevel !== NodeExecutionLevel.CURRENT ? `${nodeExecutionLevel} or ${NodeExecutionLevel.CURRENT}` : NodeExecutionLevel.CURRENT;
      Container.get(LoggerService).logger.debug(`No commands defined for project ${node.project} phase ${executionPhase} and level ${levelMsg}`);
    }
    return levelCommands;
  }

  private async executeCommands(node: Node, commands: string[], skipExecution: boolean, cwd?: string): Promise<ExecuteNodeResult> {
    const result: ExecuteNodeResult = {
      node,
      executeCommandResults: [],
    };
    for (const command of commands) {
      result.executeCommandResults.push(skipExecution ?
        {
          startingDate: Date.now(),
          endingDate: Date.now(),
          command,
          result: ExecutionResult.SKIP,
          errorMessage: "",
          time: 0
        } : await this.executeCommand(command, cwd));
    }
    return result;
  }

}