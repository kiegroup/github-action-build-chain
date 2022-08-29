import Container from "typedi";
import { EntryPoint } from "@bc/domain/entry-point";
import { constants } from "@bc/domain/constants";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { PreExecutor } from "@bc/service/pre-post/pre";
import { FlowService } from "@bc/service/flow/flow-service";
import { PostExecutor } from "@bc/service/pre-post/post";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { UploadResponse } from "@actions/artifact";
import { FlowResult } from "@bc/domain/flow";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

export abstract class Runner {
  private logger: LoggerService;

  constructor(entryPoint: EntryPoint) {
    Container.set(constants.CONTAINER.ENTRY_POINT, entryPoint);
    this.logger = LoggerServiceFactory.getInstance();
  }

  abstract execute(): Promise<void>;

  protected async initConfiguration(): Promise<void> {
    const configService = Container.get(ConfigurationService);
    await configService.init();
  }

  protected async executePre(): Promise<{ isFailure: boolean; output: ExecuteCommandResult[] }> {
    const preService = Container.get(PreExecutor);
    const preResult = await preService.run();
    return { isFailure: this.commandExecutionFailure(preResult), output: preResult };
  }

  protected async executeFlow(): Promise<{ isFailure: boolean; output: FlowResult }> {
    const flowService = Container.get(FlowService);
    const flowResult = await flowService.run();
    return {
      isFailure:
        this.nodeExecutionFailure(flowResult.executionResult.before) ||
        this.nodeExecutionFailure(flowResult.executionResult.commands) ||
        this.nodeExecutionFailure(flowResult.executionResult.after) ||
        this.archiveArtifactsFailure(flowResult.artifactUploadResults),
      output: flowResult,
    };
  }

  protected async executePost(flowExecutionResult: boolean): Promise<{ isFailure: boolean; output: ExecuteCommandResult[] }> {
    Container.set("post.executionSuccess", flowExecutionResult);
    const postService = Container.get(PostExecutor);
    const postResult = await postService.run();
    return { isFailure: this.commandExecutionFailure(postResult), output: postResult };
  }

  /**
   * Prints the failed commands in the following format
   * [Error] Failed to execute cmd1 :
   * [Error] This is a multiline error msg
   * [Error] broken down line wise
   * @param result
   */
  protected printExecutionFailure(result: ExecuteCommandResult[]) {
    result.forEach(res => {
      if (res.result === ExecutionResult.NOT_OK) {
        this.logger.error(`Failed to execute ${res.command} :`);
        res.errorMessage.split("\n").forEach(msg => this.logger.error(msg));
      }
    });
  }

  /**
   * Prints the failed commands for the node chain in the following format
   * [Error] Failed to execute commands for owner1/project1
   * [Error] Failed to execute cmd1 :
   * [Error] This is a multiline error msg
   * [Error] broken down line wise
   * @param result
   */
  protected printNodeExecutionFailure(result: ExecuteNodeResult[]) {
    result.forEach(res => {
      if (this.commandExecutionFailure(res.executeCommandResults)) {
        this.logger.error(`Failed to execute commands for ${res.node.project}`);
        this.printExecutionFailure(res.executeCommandResults);
      }
    });
  }

  private archiveArtifactsFailure(result: PromiseSettledResult<UploadResponse>[]) {
    return !!result.find(res => res.status === "rejected");
  }

  /**
   * Return true if there are no nodes' with a failed commands execution
   * @param result
   * @returns
   */
  private nodeExecutionFailure(result: ExecuteNodeResult[]) {
    return result.reduce((prev, curr) => prev || this.commandExecutionFailure(curr.executeCommandResults), false);
  }

  /**
   * Return true if there is command whose execution failed
   * @param result
   * @returns
   */
  private commandExecutionFailure(result: ExecuteCommandResult[]) {
    return !!result.find(res => res.result === ExecutionResult.NOT_OK);
  }
}
