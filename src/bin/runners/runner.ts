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

export abstract class Runner {
  constructor(entryPoint: EntryPoint) {
    Container.set(constants.CONTAINER.ENTRY_POINT, entryPoint);
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
