import "reflect-metadata";
import { Runner } from "@bc/bin/runners/runner";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";

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
      await this.initConfiguration();

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
        this.printNodeExecutionFailure(flowResult.output.executionResult.before);
        this.printNodeExecutionFailure(flowResult.output.executionResult.commands);
        this.printNodeExecutionFailure(flowResult.output.executionResult.after);
        this.printExecutionFailure(postResult.output);
        return process.exit(1);
      }
    } catch (err) {
      process.exit(1);
    }
  }
}
