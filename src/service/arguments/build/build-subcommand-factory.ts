import { BuildActionType, CLIActionType } from "@bc/domain/cli";
import { Command } from 'commander';
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { BranchCommand } from "@bc/service/arguments/build/branch-command";
import { CrossPullRequestCommand } from "@bc/service/arguments/build/cross-pr-command";
import { FullDownstreamCommand } from "@bc/service/arguments/build/fd-command";
import { SinglePullRequestCommand } from "@bc/service/arguments/build/single-pr-command";
import { formatDate } from "@bc/service/utils/date";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";

/**
 * A factory to construct command line parsers for all the different kind of build flows
 */
export class BuildSubCommandFactory {
    /**
     * Constructs the argument parser for a command line utility
     * @param buildType Type of command for which the parser has to be constructed
     * @returns {Command} Returns command parser object or throws an error if the cmd is not defined
     */
    static getCommand(buildType: BuildActionType): Command {
        let commandFactory: CommandConstructor;
        switch (buildType) {
            case BuildActionType.CROSS_PULL_REQUEST:
                commandFactory = new CrossPullRequestCommand();
                break;
            case BuildActionType.SINGLE_PULL_REQUEST:
                commandFactory = new SinglePullRequestCommand();
                break;
            case BuildActionType.FULL_DOWNSTREAM:
                commandFactory = new FullDownstreamCommand();
                break;
            case BuildActionType.BRANCH:
                commandFactory = new BranchCommand();
                break;        
            default:
                throw new Error(`No command constructor specified for ${buildType}`);
        }

        let cmd: Command = commandFactory.createCommand();
        cmd
            .requiredOption('-f, --defintionFile <path_or_url>', 'The definition file, either a path to the filesystem or a URL to it')
            .option('-o, --outputFolder <path>', 'The folder path to store projects. Default is of the format "build_chain_yyyymmddHHMMss"', 
                `build_chain_${formatDate(new Date())}`)
            .option('-t, --token <token>', 'The GITHUB_TOKEN. It can be set as an environment variable instead')
            .option('-d, --debug', 'Set debugging mode to true', false)
            .option('--skipExecution', 'A flag to skip execution and artifacts archiving', false)
            .option('--skipParallelCheckout', 'Checkout the project sequentially', false)
            .option('-r, --replace <RegEx||ReplacementEx>', 'Regex defines the regular expression for what you want to replace with the ReplacementEx')
            .option('--skipCheckout <projects...>', 'A list of projects to skip checkout')
            .action((options) => {
                    ParsedOptions.setOpts(options);
                    ParsedOptions.setExecutedCommand({command: CLIActionType.BUILD, action: buildType});
            });
        
        return cmd;
    }

    /**
     * Constructs the parsers for all the commands available
     * @returns {Command[]} Array of objects of command line parsers
     */
    static getAllCommands(): Command[] {
        return Object
                    .keys(BuildActionType)
                    .map((buildType) => this.getCommand(BuildActionType[buildType as keyof typeof BuildActionType]));
    }
}