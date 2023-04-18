import "reflect-metadata";
import { Runner } from "@bc/bin/runners/runner";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { ToolService } from "@bc/service/tools/tools-service";

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
        return await this.executeBuild(); 
      }      
    } catch (err) {
      process.exit(1);
    }
  }

  private async executeBuild() {
    // execute pre section
    const preResult = await this.executePre();
    if (preResult.isFailure) {
      this.printExecutionFailure(preResult.output);
      return process.exit(1);
    }

    // execute flow: checkout node chain -> execute commands for each phase -> upload artifacts
    const flowResult = await this.executeFlow();

    // execute post section
    const postResult = await this.executePost(flowResult.isFailure);

    if (flowResult.isFailure || postResult.isFailure) {
      this.printNodeExecutionFailure(flowResult.output.executionResult);
      this.printExecutionFailure(postResult.output);
      return process.exit(1);
    }
  }

  private async executeTools() {
    const toolService = Container.get(ToolService);
    return toolService.execute();
  }
}
