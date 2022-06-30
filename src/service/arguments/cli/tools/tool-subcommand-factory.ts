import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { CLIActionType, ToolType } from "@bc/domain/cli";
import { ProjectListCommand } from "@bc/service/arguments/cli/tools/project-list";
import { ParsedInputs } from "@bc/service/inputs/parsed-inputs";
import Container from "typedi";



/**
 * A factory to construct command line parsers for all the different kind of tools
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
        
        return commandFactory.createCommand()
            .requiredOption("-f, --defintionFile <path_or_url>", "The definition file, either a path to the filesystem or a URL to it")
            .option("-t, --token <token>", "The GITHUB_TOKEN. It can be set as an environment variable instead")
            .option("-d, --debug", "Set debugging mode to true", false)
            .action((options) => {
                const parsedInputs = Container.get(ParsedInputs);
                parsedInputs.updateInputs({...options, CLICommand: CLIActionType.TOOLS, CLISubCommand: toolType});
            });
        
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