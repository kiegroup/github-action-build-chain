import { CLIActionType } from "@bc/domain/cli";
import { BuildSubCommandFactory } from "@bc/service/arguments/cli/build/build-subcommand-factory";
import { ToolSubCommandFactory } from "@bc/service/arguments/cli/tools/tool-subcommand-factory";
import { Command } from "commander";
import { Service } from "typedi";

/**
 * Constructs and compiles all the subcommands together to produce the main cli parser
 */
@Service()
export class CLIArguments {
  /**
   * Constructs the argument parser for the main command line utility
   * @param options [OPTIONAL] configure the parser to not throw errors or write output. Useful for testing
   * @returns {Command} Returns command parser object
   */
  getCommand(options?: { exitOverride?: boolean; suppressOutput?: boolean }): Command {
    const program = new Command();

    program.name("build-chain").description("A CLI tool to perform the build chain github actions");

    const buildSubProgram = new Command(CLIActionType.BUILD).description("Execute different flows");
    const toolSubProgram = new Command(CLIActionType.TOOLS).description("A bunch of utility tools");

    BuildSubCommandFactory.getAllCommands().forEach(cmd => buildSubProgram.addCommand(this.setConfig(cmd, options)));
    ToolSubCommandFactory.getAllCommands().forEach(cmd => toolSubProgram.addCommand(this.setConfig(cmd, options)));

    program.addCommand(buildSubProgram);
    program.addCommand(toolSubProgram);

    return program;
  }

  /**
   * Configure the command line parser instance according to the options passed
   * Updates the instance to not to throw any error and suppress output
   * Useful for testing
   * @param program command line parser
   * @param options additional options to configure program instance
   * @returns {Command} configured command line parser
   */
  private setConfig(program: Command, options?: { exitOverride?: boolean; suppressOutput?: boolean }): Command {
    if (options?.exitOverride) {
      program.exitOverride();
    }
    if (options?.suppressOutput) {
      program.configureOutput({
        writeOut: () => undefined,
        writeErr: () => undefined,
      });
    }
    return program;
  }
}
