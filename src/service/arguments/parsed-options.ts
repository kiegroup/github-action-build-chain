import { ExecutedCommand } from "@bc/domain/cli";
import { OptionValues } from "commander";

/**
 * Singleton class to manage parsed options and executed commands
 */
export class ParsedOptions {
    // store parsed options
    private static opts: OptionValues = {};

    // store which command was executed
    private static executedCommand: ExecutedCommand;

    /**
     * Getter for parsed options
     * @returns Object containing parsed options
     */
    static getOpts(): OptionValues {
        return this.opts;
    }

    /**
     * Setter for parsed options
     * @param updatedOpts Options that were obtained from the parser
     */
    static setOpts(updatedOpts: OptionValues) {
        this.opts = {...this.opts, ...updatedOpts};
    }

    /**
     * Getter for the executed command
     * @returns Object that contains which command was executed (build or tool) and corresponding action (cross_pr, project-list etc)
     */
    static getExecutedCommand(): ExecutedCommand {
        return this.executedCommand;
    }

    /**
     * Setter for executed command
     * @param cmd Object that contained info on the executed command and action
     */
    static setExecutedCommand(cmd: ExecutedCommand) {
        this.executedCommand = cmd;
    }
}