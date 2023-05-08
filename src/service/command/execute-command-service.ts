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
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { ExecOptions } from "@actions/exec";

@Service()
export class ExecuteCommandService {
  private logger: BaseLoggerService;

  constructor(private _commandTreatmentDelegator: CommandTreatmentDelegator,
              private _commandExecutorDelegator: CommandExecutorDelegator,
              private _configurationService: ConfigurationService,
            ) {
    this.logger = Container.get(LoggerService).logger;
  }

  public async executeNodeChain(chain: NodeExecution[], printResults?: (node: ExecuteNodeResult[]) => void) {
    return this._configurationService.isParallelExecutionEnabled() ?
            this.executeNodeChainParallel(chain, printResults) :
            this.executeNodeChainSequential(chain, printResults);
  }

  public async executeCommand(command: string, opts?: ExecOptions): Promise<ExecuteCommandResult> {
    const treatedCommand = this._commandTreatmentDelegator.treatCommand(command, this._configurationService.getTreatmentOptions());
    return this._commandExecutorDelegator.executeCommand(treatedCommand, opts);
  }

  public async executeNodeCommands(nodeToBeExecuted: NodeExecution, opts?: ExecOptions): Promise<ExecuteNodeResult[]> {
    const result: ExecuteNodeResult[] = [];
    const {node, cwd} = nodeToBeExecuted;
    const before = this.getNodeCommands(node, ExecutionPhase.BEFORE, this._configurationService.getNodeExecutionLevel(node));
    const current = this.getNodeCommands(node, ExecutionPhase.CURRENT, this._configurationService.getNodeExecutionLevel(node));
    const after = this.getNodeCommands(node, ExecutionPhase.AFTER, this._configurationService.getNodeExecutionLevel(node));
    const skipExecution = this._configurationService.skipExecution(node);
    result.push(await this.executeCommands(node, before ?? [], skipExecution, {...opts, cwd}));
    result.push(await this.executeCommands(node, current ?? [], skipExecution, {...opts, cwd}));
    result.push(await this.executeCommands(node, after ?? [], skipExecution, {...opts, cwd}));
    return result;
  }

  public getNodeCommands(node: Node, executionPhase: ExecutionPhase, nodeExecutionLevel: NodeExecutionLevel): string[] | undefined {
    const commands = node[`${executionPhase}`];
    let levelCommands;
    if (commands) {
      levelCommands = commands[`${nodeExecutionLevel}`].length ? commands[`${nodeExecutionLevel}`] : commands[`${NodeExecutionLevel.CURRENT}`];
    }
    if (!commands) {
      this.logger.debug(`No commands defined for project ${node.project} and phase ${executionPhase}`);
    } else if (!levelCommands || !levelCommands.length) {
      const levelMsg = nodeExecutionLevel !== NodeExecutionLevel.CURRENT ? `${nodeExecutionLevel} or ${NodeExecutionLevel.CURRENT}` : NodeExecutionLevel.CURRENT;
      this.logger.debug(`No commands defined for project ${node.project} phase ${executionPhase} and level ${levelMsg}`);
    }
    return levelCommands;
  }

  private async executeCommands(node: Node, commands: string[], skipExecution: boolean, opts?: ExecOptions): Promise<ExecuteNodeResult> {
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
        } : await this.executeCommand(command, opts));
    }
    return result;
  }

  private async executeNodeChainSequential(chain: NodeExecution[], printResults?: (node: ExecuteNodeResult[]) => void) {
    const result: ExecuteNodeResult[][] = [];
    for (const node of chain) {
      this.logger.startGroup(`Executing ${node.node.project}`);
      const currentNodeResult = await this.executeNodeCommands(node);
      result.push(currentNodeResult);
      this.logger.info(`Execution summary for ${node.node.project}`);
      
      if (printResults) {
        printResults(currentNodeResult);
      }
      
      this.logger.endGroup();
    }
    return result;
  }

  private async executeNodeChainParallel(chain: NodeExecution[], printResults?: (node: ExecuteNodeResult[]) => void) {
    const result: ExecuteNodeResult[][] = [];
    const maxDepth = Math.max(...chain.map(c => c.node.depth));

    // we can only execute projects that have the same depth since these projects don't depend each other
    this.logger.startGroup("Calculating projects that can be executed parallely");
    const groups = chain.reduce((prev: Record<number, NodeExecution[]>, curr) => {
      if (!prev[curr.node.depth]) {
        prev[curr.node.depth] = [];
      }
      prev[curr.node.depth].push(curr);
      return prev;
    }, {});

    Object.entries(groups).forEach(v => {
      this.logger.info(`${parseInt(v[0]) + 1}. [${v[1].map(n => n.node.project)}]`);
    });
    this.logger.endGroup();

    for (let depth = 0; depth <= maxDepth; depth += 1) {
      // start executing the current group and storing their output in buffer. Don't await right now just start execution
      const buffers = groups[depth].reduce((prev: Record<string, Buffer>, curr) => {
        prev[curr.node.project] = Buffer.alloc(0);
        return prev;
      }, {});
      const currentResults: Record<string, ExecuteNodeResult[]> = {};
      await Promise.all(
        groups[depth].map(
          node => this.executeNodeCommands(node, {
              silent: true, 
              listeners: {
                stdout: data => {
                  buffers[node.node.project] = Buffer.concat([
                    buffers[node.node.project],
                    data
                  ]);
                },
                stderr: data => {
                  buffers[node.node.project] = Buffer.concat([
                    buffers[node.node.project],
                    data
                  ]);
                }
              }
            })
            .then(r => {
              currentResults[node.node.project] = r;
              result.push(r);
            })
        )
      );
      
      // print output to stdout for the previous group
      for (const [project, buffer] of Object.entries(buffers)) {
        this.logger.startGroup(`Executing ${project}`);
        this.logger.logger.log(buffer.toString());
        this.logger.info(`Execution summary for ${project}`);
        if (printResults) {
          printResults(currentResults[project]);
        }
        this.logger.endGroup();
      }
    }
    return result;
  }
}