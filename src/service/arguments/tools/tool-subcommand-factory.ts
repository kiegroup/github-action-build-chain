import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { CLIActionType, ToolType } from "@bc/domain/cli";
import { ProjectListCommand } from "@bc/service/arguments/tools/project-list";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";


/**
 * A factory to construct command line parsers for all the different kind of build flows
 */
export class ToolSubCommandFactory {
    /**
     * Constructs the argument parser for a command line utility
     * @param toolType Type of command for which the parser has to be constructed
     * @returns {Command | undefined} Returns command parser object or throws an error if the cmd is not defined
     */
    static getCommand(toolType: ToolType): Command {
        let commandFactory: CommandConstructor;
        switch (toolType) {
            case ToolType.PROJECT_LIST:
                commandFactory = new ProjectListCommand();
                break;
            
            default:
                throw new Error(`No command constructor specified for ${toolType}`);
        }
        
        const cmd: Command = commandFactory.createCommand();
        cmd.action((options) => {
            ParsedOptions.setOpts(options);
            ParsedOptions.setExecutedCommand({command: CLIActionType.TOOLS, action: toolType});
        });
        
        return cmd;
    }

    /**
     * Constructs the parsers for all the commands available
     * @returns {Command[]} Array of objects of command line parsers
     */
    static getAllCommands(): Command[] {
        return Object
                    .keys(ToolType)
                    .map((toolType) => this.getCommand(ToolType[toolType as keyof typeof ToolType]));
    }
}