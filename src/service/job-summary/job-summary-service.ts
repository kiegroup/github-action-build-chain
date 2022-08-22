import Container, { Service } from "typedi";
import * as core from "@actions/core";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { FlowType } from "@bc/domain/inputs";
import { GitCLIService } from "@bc/service/git/git-cli";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { CheckedOutNode } from "@bc/domain/checkout";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { FlowResult } from "@bc/domain/flow";
import { ExecutionPhase } from "@bc/domain/execution-phase";

@Service()
export class JobSummaryService {
  private configService: ConfigurationService;
  private gitService: GitCLIService;

  constructor() {
    this.configService = Container.get(ConfigurationService);
    this.gitService = Container.get(GitCLIService);
  }

  async generateSummary(flowResult: FlowResult, preResult: ExecuteCommandResult[], postResult: ExecuteCommandResult[]) {
    const flowType = this.configService.getFlowType();
    if (flowType === FlowType.BRANCH) {
      return;
    }
    const localExecution = core.summary
      .emptyBuffer()
      .addRaw("You can copy paste the following commands to locally execute build chain tool.", true)
      .addCodeBlock(
        `npm i ${process.env.npm_package_name}@${
          process.env.npm_package_version
        } -g build-chain-action -f ${this.configService.getDefinitionFileUrl()} build ${flowType} -u ${this.configService.getEventUrl()}`
      )
      .addEOL()
      .addRaw(`**Git Version**: \`${await this.gitService.version()}\``, true)
      .addRaw("> **_Notice_**: The `GITHUB_TOKEN` should be set in the environment.", true)
      .stringify();

    const before = this.constructExecutionResult(flowResult.executionResult.before, flowResult.checkoutInfo);
    const current = this.constructExecutionResult(flowResult.executionResult.commands, flowResult.checkoutInfo);
    const after = this.constructExecutionResult(flowResult.executionResult.after, flowResult.checkoutInfo);
    const pre = this.constructPrePostResult(preResult);
    const post = this.constructPrePostResult(postResult);

    await core.summary
      .emptyBuffer()
      .addHeading("Build Chain Execution Summary")
      .addEOL()
      .addRaw(
        `**Project Starting the Job:** [${this.configService.getStarterProjectName()}](https://github.com/${this.configService.getStarterProjectName()})`,
        true
      )
      .addDetails("Pre", pre)
      .addDetails(`Execution phase: ${ExecutionPhase.BEFORE}`, before)
      .addDetails(`Execution phase: ${ExecutionPhase.CURRENT}`, current)
      .addDetails(`Execution phase: ${ExecutionPhase.AFTER}`, after)
      .addDetails("Post", post)
      .addDetails("Local Execution", localExecution)
      .write();
  }

  private constructPrePostResult(result: ExecuteCommandResult[]): string {
    const prePostTableHeaders = [
      { data: "Command", header: true },
      { data: "Execution Result", header: true },
      { data: "Execution Time", header: true },
    ];
    const data = result.map((res) => [res.command, this.getExecutionResultString(res.result), `${res.time}`]);
    return core.summary
      .emptyBuffer()
      .addTable([prePostTableHeaders, ...data])
      .stringify();
  }

  private constructExecutionResult(executionNodeResult: ExecuteNodeResult[], checkoutInfo: CheckedOutNode[]): string {
    const tableHeaders = [
      { data: "Project", header: true },
      { data: "Source", header: true },
      { data: "Target", header: true },
      { data: "Merged", header: true },
      { data: "Execution Result", header: true },
      { data: "Avg Execution Time", header: true },
    ];
    return core.summary
      .emptyBuffer()
      .addTable([tableHeaders, ...this.getExecutionResultData(executionNodeResult, checkoutInfo)])
      .addEOL()
      .addRaw("```mermaid", true)
      .addRaw(this.constructGraph(executionNodeResult), true)
      .addRaw("```", true)
      .stringify();
  }

  private getExecutionResult(executeCommandResults: ExecuteCommandResult[]): ExecutionResult {
    return executeCommandResults.find((res) => res.result !== ExecutionResult.OK)?.result ?? ExecutionResult.OK;
  }

  private getExecutionResultString(result: ExecutionResult): string {
    switch (result) {
      case ExecutionResult.NOT_OK:
        return "\u274C";
      case ExecutionResult.SKIP:
        return "&#9940;";
      default:
        return "\u2705";
    }
  }

  private getExecutionResultData(executionResult: ExecuteNodeResult[], checkoutInfo: CheckedOutNode[]): string[][] {
    return executionResult.map((res) => {
      const nodeCheckoutInfo = checkoutInfo.find((info) => info.node.project === res.node.project)!.checkoutInfo;
      const result = this.getExecutionResultString(this.getExecutionResult(res.executeCommandResults));

      return [
        res.node.project,
        nodeCheckoutInfo ? `${nodeCheckoutInfo.targetGroup}/${nodeCheckoutInfo.targetName}:${nodeCheckoutInfo.targetBranch}` : "checkout skipped",
        nodeCheckoutInfo ? `${nodeCheckoutInfo.sourceGroup}/${nodeCheckoutInfo.sourceName}:${nodeCheckoutInfo.sourceBranch}` : "checkout skipped",
        nodeCheckoutInfo?.merge ? "\u2705" : "\u274C",
        result,
        res.executeCommandResults.length > 0
          ? `${res.executeCommandResults.reduce((prev, curr) => prev + curr.time, 0) / res.executeCommandResults.length}`
          : "0",
      ];
    });
  }

  private constructGraph(executionResult: ExecuteNodeResult[]) {
    return `flowchart LR;
        ${executionResult
          .map((res) => {
            const result = this.getExecutionResult(res.executeCommandResults);
            let className = "okClass";
            switch (result) {
              case ExecutionResult.NOT_OK:
                className = "errorClass";
                break;
              case ExecutionResult.SKIP:
                className = "noEntry";
                break;
            }
            return `${res.node.project}:::${className}`;
          })
          .join("==>")}
        ${executionResult.map((res) => `click ${res.node.project} 'https://github.com/${res.node.project}'`).join("\n\t\t\t\t")}
        classDef okClass fill:#218838,stroke:#1e7e34,color: #fff,border-radius: 4px
        classDef errorClass fill:#dc3545,stroke:#dc3545,color: #fff,border-radius: 4px
        classDef noEntry fill:#6c757d,stroke:#6c757d,color: #fff,border-radius: 4px`;
  }
}
