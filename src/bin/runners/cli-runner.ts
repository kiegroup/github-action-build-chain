import "reflect-metadata";
import { Runner } from "@bc/bin/runners/runner";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { ToolService } from "@bc/service/tools/tools-service";
import { DEFAULT_STATE_FILENAME, ResumeState } from "@bc/domain/resume";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { FlowService } from "@bc/service/flow/flow-service";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { writeFileSync } from "fs-extra";
import path from "path";

export class CLIRunner extends Runner {
  constructor() {
    super(EntryPoint.CLI);
  }

  async execute(): Promise<void> {
    try {
      // parse arguments
      const args = Container.get(CLIArguments);
      args.getCommand().parse();

      // initialize configuration
      const configService = await this.initConfiguration();

      if (configService.isToolsCommand()) {
        return await this.executeTools();
      } else {
        return await this.executeBuild()
          .catch(err => {
            this.saveState();
            throw err;
          }); 
      }      
    } catch (err) {
      await this.safeAsyncExit(1);
    }
  }

  private async executeBuild(): Promise<void> {
    // execute pre section
    const preResult = await this.executePre();
    if (preResult.isFailure) {
      this.printExecutionFailure(preResult.output);
      return this.safeAsyncExit(1);
    }

    // execute flow: checkout node chain -> execute commands for each phase -> upload artifacts
    const flowResult = await this.executeFlow();

    // execute post section
    const postResult = await this.executePost(flowResult.isFailure);

    let exitCode = 0;
    if (flowResult.isFailure || postResult.isFailure) {
      this.printNodeExecutionFailure(flowResult.output.executionResult);
      this.printExecutionFailure(postResult.output);
      exitCode = 1;
    }
    this.saveState();
    return this.safeAsyncExit(exitCode);
  }

  private async executeTools() {
    return Container.get(ToolService).execute();
  }

  private saveState() {
    const configService = Container.get(ConfigurationService);
    const state: ResumeState = {
      configurationService: Container.get(ConfigurationService).toJSON(),
      flowService: Container.get(FlowService).toJSON(),
      checkoutService: Container.get(CheckoutService).toJSON()
    };
    writeFileSync(path.join(configService.getRootFolder(), DEFAULT_STATE_FILENAME), JSON.stringify(state));
  }
}
