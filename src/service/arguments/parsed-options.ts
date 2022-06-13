import { ExecutedCommand } from "@bc/domain/cli";
import { OptionValues } from "commander";

export class ParsedOptions {
    private static opts: OptionValues = {};
    private static executedCommand: ExecutedCommand;

    static getOpts(): OptionValues {
        return this.opts;
    }

    static setOpts(updatedOpts: OptionValues) {
        this.opts = {...this.opts, ...updatedOpts};
    }

    static getExecutedCommand(): ExecutedCommand {
        return this.executedCommand;
    }

    static setExecutedCommand(cmd: ExecutedCommand) {
        this.executedCommand = cmd;
    }
}