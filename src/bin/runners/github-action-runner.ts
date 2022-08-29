#!/usr/bin/env node

import "reflect-metadata";
import { Runner } from "@bc/bin/runners/runner";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { JobSummaryService } from "@bc/service/job-summary/job-summary-service";
import { defaultFlowResult } from "@bc/domain/flow";

export class GithubActionRunner extends Runner {
  constructor() {
    super(EntryPoint.GITHUB_EVENT);
  }

  async execute(): Promise<void> {
    // initialize configuration
    await this.initConfiguration();

    const jobSummaryService = Container.get(JobSummaryService);

    // execute pre section
    const preResult = await this.executePre();
    if (preResult.isFailure) {
      // io task is involved so start it as a promise and wait for it when actually needed
      const promise = jobSummaryService.generateSummary(defaultFlowResult, preResult.output, []);
      this.printExecutionFailure(preResult.output);
      await promise;
      return process.exit(1);
    }

    // execute flow: checkout node chain -> execute commands for each phase -> upload artifacts
    const flowResult = await this.executeFlow();

    // execute post section
    const postResult = await this.executePost(flowResult.isFailure);

    // post a job summary
    // io task is involved so start it as a promise and wait for it when actually needed
    const promise = jobSummaryService.generateSummary(flowResult.output, preResult.output, postResult.output);

    if (flowResult.isFailure || postResult.isFailure) {
      this.printNodeExecutionFailure(flowResult.output.executionResult.before);
      this.printNodeExecutionFailure(flowResult.output.executionResult.commands);
      this.printNodeExecutionFailure(flowResult.output.executionResult.after);
      this.printExecutionFailure(postResult.output);
      await promise;
      return process.exit(1);
    }

    await promise;
  }
}
