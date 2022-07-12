import { Service } from "typedi";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { Node } from "@bc/domain/node";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { ConfigurationService } from "@bc/service/config/configuration-service";

@Service()
export class ExecuteCommandService {

  constructor(private _commandTreatmentDelegator: CommandTreatmentDelegator,
              private _commandExecutorDelegator: CommandExecutorDelegator,
              private _configurationService: ConfigurationService) {
  }

  public async executeCommand(command: string, cwd?: string): Promise<ExecuteCommandResult> {
    const treatedCommand = this._commandTreatmentDelegator.treatCommand(command, this._configurationService.getTreatmentOptions());
    return await this._commandExecutorDelegator.executeCommand(treatedCommand, cwd);
  }

  public async executeChainCommands(nodes: Node[], executionPhase: ExecutionPhase, cwd?: string): Promise<ExecuteNodeResult[]> {
    const result: ExecuteNodeResult[] = [];
    for (const node of nodes.values()) {
      const commands = this.getNodeCommands(node, executionPhase, this._configurationService.getNodeExecutionLevel(node));
      if (commands?.length) {
        result.push(await this.executeNodeCommands(node, commands, this._configurationService.skipExecution(node), cwd));
      } else {
        result.push({ node });
      }
    }
    return result;
  }

  private async executeNodeCommands(node: Node, commands: string[], skipExecution: boolean, cwd?: string): Promise<ExecuteNodeResult> {
    const result: ExecuteNodeResult = {
      node,
      executeCommandResults: [],
    };
    for await (const command of commands.values()) {
      result.executeCommandResults?.push(skipExecution ?
        {
          startingDate: Date.now(),
          endingDate: Date.now(),
          command,
          result: ExecutionResult.SKIP,
        } : await this.executeCommand(command, cwd));
    }
    return result;
  }

  private getNodeCommands(node: Node, executionPhase: ExecutionPhase, nodeExecutionLevel: NodeExecutionLevel): string[] | undefined {
    const commands = node[`${executionPhase}`];
    const levelCommands = commands ? commands[`${nodeExecutionLevel}`].length ? commands[`${nodeExecutionLevel}`] : commands[`${NodeExecutionLevel.CURRENT}`] : undefined;
    if (!commands) {
      LoggerServiceFactory.getInstance().debug(`No commands defined for project ${node.project} and phase ${executionPhase}`);
    } else if (!levelCommands || !levelCommands.length) {
      LoggerServiceFactory.getInstance().debug(`No commands defined for project ${node.project} phase ${executionPhase} and level ${nodeExecutionLevel !== NodeExecutionLevel.CURRENT ? `${nodeExecutionLevel} or ${NodeExecutionLevel.CURRENT}` : NodeExecutionLevel.CURRENT}`);
    }
    return levelCommands;
  }
}