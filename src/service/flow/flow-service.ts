import { UploadResponse } from "@actions/artifact";
import { CheckedOutNode } from "@bc/domain/checkout";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { NodeExecution } from "@bc/domain/node-execution";
import { ArtifactService } from "@bc/service/artifacts/artifact-service";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import Container, { Service } from "typedi";

@Service()
export class FlowService {
  private configService: ConfigurationService;
  private checkoutService: CheckoutService;
  private executor: ExecuteCommandService;
  private logger: LoggerService;
  private artifactService: ArtifactService;

  constructor() {
    this.configService = Container.get(ConfigurationService);
    this.checkoutService = Container.get(CheckoutService);
    this.executor = Container.get(ExecuteCommandService);
    this.artifactService = Container.get(ArtifactService);
    this.logger = LoggerServiceFactory.getInstance();
  }

  async run(): Promise<{
    checkoutInfo: CheckedOutNode[];
    artifactUploadResults: PromiseSettledResult<UploadResponse>[];
    executionResult: {
      [key in ExecutionPhase]: ExecuteNodeResult[]
    }
  }> {
    const flowType = this.configService.getFlowType();
    this.logger.startGroup(`[${flowType}] Execution Plan`);
    this.printExecutionPlan();
    this.logger.endGroup();

    this.logger.info(`[${flowType}] Checking out ${this.configService.getStarterProjectName()} and its dependencies`);
    const checkoutInfo = await this.checkoutService.checkoutDefinitionTree();

    this.logger.startGroup(`[${flowType}] Checkout Summary`);
    this.printCheckoutSummary(checkoutInfo);
    this.logger.endGroup();

    const nodeChainForExecution: NodeExecution[] = checkoutInfo.map((info) => ({ node: info.node, cwd: info.checkoutInfo?.repoDir }));

    // not looping through the keys of ExecutionPhase just so that we can enforce the order in which the phases need to be executed
    const before = await this.executeAndPrint(nodeChainForExecution, ExecutionPhase.BEFORE);
    const commands = await this.executeAndPrint(nodeChainForExecution, ExecutionPhase.CURRENT);
    const after = await this.executeAndPrint(nodeChainForExecution, ExecutionPhase.AFTER);

    // archive artifacts
    this.logger.startGroup(`[${flowType}] Uploading artifacts`);
    const artifactUploadResults = await this.artifactService.uploadNodes(this.configService.nodeChain, this.configService.getStarterNode());
    this.logger.endGroup();

    return { checkoutInfo, artifactUploadResults, executionResult: {after, commands, before} };
  }

  /**
   * Prints the execution plan for the node chain in the following format:
   *
   * 3 projects will be executed
   * [owner/project]
   *    Level type: current
   *    [before]
   *        cmd1
   *        cmd2
   *    [command]
   *        cmd1
   *    [after]
   *        cmd1
   * [abc/xyz]
   *    Level type: downstream
   *    No command will be executed (this project will be skipped)
   * [def/ghi]
   *    Level type: upstream
   *    [before]
   *        cmd1
   *    [after]
   *        cmd1
   */
  private printExecutionPlan() {
    this.logger.info(`${this.configService.nodeChain.length} projects will be executed`);
    this.configService.nodeChain.forEach((node) => {
      const nodeLevel = this.configService.getNodeExecutionLevel(node);
      this.logger.info(`[${node.project}]`);
      this.logger.info(`\t Level type: ${nodeLevel}`);

      if (this.configService.skipExecution(node)) {
        this.logger.info("\t No command will be executed (this project will be skipped)");
      } else {
        const before = this.executor.getNodeCommands(node, ExecutionPhase.BEFORE, nodeLevel);
        const current = this.executor.getNodeCommands(node, ExecutionPhase.CURRENT, nodeLevel);
        const after = this.executor.getNodeCommands(node, ExecutionPhase.AFTER, nodeLevel);

        if (before && before.length > 0) {
          this.logger.info(`\t [${ExecutionPhase.BEFORE}]`);
          this.logger.info(`\t\t ${before.join("\n")}`);
        }

        if (current && current.length > 0) {
          this.logger.info(`\t [${ExecutionPhase.CURRENT}]`);
          this.logger.info(`\t\t ${current.join("\n")}`);
        }

        if (after && after.length > 0) {
          this.logger.info(`\t [${ExecutionPhase.AFTER}]`);
          this.logger.info(`\t\t ${after.join("\n")}`);
        }
      }
    });
  }

  /**
   * Prints the checkout info for the node chain in the following format:
   *
   * [owner/project]
   *    Project taken from owner/project:main
   *    Merged owner1/project-forked:
   * [abc/xyz]
   *    This project wasn't checked out
   * [def/ghi]
   *    Project taken from def/ghi:dev
   */
  private printCheckoutSummary(checkoutInfo: CheckedOutNode[]) {
    checkoutInfo.forEach((info) => {
      this.logger.info(`[${info.node.project}]`);
      if (info.checkoutInfo) {
        this.logger.info(`\t Project taken from ${info.checkoutInfo.targetGroup}/${info.checkoutInfo.targetName}:${info.checkoutInfo.targetBranch}`);
        if (info.checkoutInfo.merge) {
          this.logger.info(
            `\t Merged ${info.checkoutInfo.sourceGroup}/${info.checkoutInfo.sourceName}:${info.checkoutInfo.sourceBranch} into branch ${info.checkoutInfo.targetBranch}`
          );
        }
      } else {
        this.logger.info("\t This project wasn't checked out");
      }
    });
  }

  /**
   * Prints the checkout info for the node chain in the following format:
   *
   * [owner/project]
   *    [OK] cmd1 [Executed in: 10s]
   * [abc/xyz]
   *    No commands were found for this project
   * [def/ghi]
   *    [NOT_OK] cmd2 [Executed in: 5s]
   *        Error: msg
   */
  private printExecutionSummary(result: ExecuteNodeResult[]) {
    result.forEach((res) => {
      this.logger.info(`[${res.node.project}]`);
      if (res.executeCommandResults.length === 0) {
        this.logger.info("\t No commands were found for this project");
      }
      res.executeCommandResults.forEach((cmdRes) => {
        this.logger.info(`\t [${cmdRes.result}] ${cmdRes.command} [Executed in ${cmdRes.time} ms]`);
        if (cmdRes.result === ExecutionResult.NOT_OK) {
          this.logger.info(`\t\t Error: ${cmdRes.errorMessage}`);
        }
      });
    });
  }

  private async executeAndPrint(chain: NodeExecution[], phase: ExecutionPhase): Promise<ExecuteNodeResult[]> {
    this.logger.info(`[${this.configService.getFlowType()}] Executing ${phase}`);
    const result = await this.executor.executeChainCommands(chain, phase);
    this.logger.startGroup(`Execution summary for phase ${phase}`);
    this.printExecutionSummary(result);
    this.logger.endGroup();
    return result;
  }
}
