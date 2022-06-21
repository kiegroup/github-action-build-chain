import { BuildSubCommandFactory } from "@bc/service/arguments/build/build-subcommand-factory";
import { ToolSubCommandFactory } from "@bc/service/arguments/tools/tool-subcommand-factory";
import { Command } from "commander";


/**
 * Constructs and compiles all the subcommands together to produce the main cli parser
 */
export class MainCommandFactory {
    /**
     * Constructs the argument parser for the main command line utility
     * @param options [OPTIONAL] configure the parser to not throw errors or write output. Useful for testing
     * @returns {Command} Returns command parser object
     */
    static getCommand(options?: { exitOverride?: boolean, suppressOutput?: boolean }): Command {
        const program = new Command();

        program
            .name("build-chain")
            .description("A CLI tool to perform the build chain github actions");
        
        BuildSubCommandFactory.getAllCommands().forEach((cmd) => program.addCommand(this.setConfig(cmd, options)));
        ToolSubCommandFactory.getAllCommands().forEach((cmd) => program.addCommand(this.setConfig(cmd, options)));

        return this.setConfig(program, options);
    }

    /**
     * Configure the command line parser instance according to the options passed
     * Updates the instance to not to throw any error and suppress output
     * Useful for testing
     * @param program command line parser
     * @param options additional options to configure program instance
     * @returns {Command} configured command line parser
     */
    private static setConfig(program: Command, options?: { exitOverride?: boolean, suppressOutput?: boolean }): Command {
        if (options?.exitOverride) {
            program.exitOverride();
        }
        if (options?.suppressOutput) {
            program.configureOutput({
              writeOut: () => undefined,
              writeErr: () => undefined
            });
        }
        return program;
    }
}