import { CLIActionType } from "@bc/domain/cli";
import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { BranchCommand } from "@bc/service/arguments/cli/build/branch-command";
import { CrossPullRequestCommand } from "@bc/service/arguments/cli/build/cross-pr-command";
import { FullDownstreamCommand } from "@bc/service/arguments/cli/build/fd-command";
import { SinglePullRequestCommand } from "@bc/service/arguments/cli/build/single-pr-command";
import { formatDate } from "@bc/utils/date";
import { InputService } from "@bc/service/inputs/input-service";
import Container from "typedi";
import { FlowType, LoggerLevel } from "@bc/domain/inputs";

/**
 * A factory to construct command line parsers for all the different kind of build flows
 */
export class BuildSubCommandFactory {
  /**
   * Constructs the argument parser for a command line utility
   * @param buildType Type of command for which the parser has to be constructed
   * @returns {Command} Returns command parser object or throws an error if the cmd is not defined
   */
  static getCommand(buildType: FlowType): Command {
    let commandFactory: CommandConstructor;
    switch (buildType) {
      case FlowType.CROSS_PULL_REQUEST:
        commandFactory = new CrossPullRequestCommand();
        break;
      case FlowType.SINGLE_PULL_REQUEST:
        commandFactory = new SinglePullRequestCommand();
        break;
      case FlowType.FULL_DOWNSTREAM:
        commandFactory = new FullDownstreamCommand();
        break;
      case FlowType.BRANCH:
        commandFactory = new BranchCommand();
        break;
      default:
        throw new Error(`No command constructor specified for ${buildType}`);
    }

    return commandFactory
      .createCommand()
      .requiredOption("-f, --definitionFile <path_or_url>", "The definition file, either a path to the filesystem or a URL to it")
      .option("-o, --outputFolder <path>", "The folder path to store projects. Default is of the format 'build_chain_yyyymmddHHMMss'", `build_chain_${formatDate(new Date())}`)
      .option("--token <token...>", "The GITHUB_TOKEN. It can be set as an environment variable instead")
      .option("-d, --debug", "Set debugging mode to true", false)
      .option("--skipExecution", "A flag to skip execution and artifacts archiving for all projects. Overrides skipProjectExecution", false)
      .option("--skipProjectExecution <projects...>", "A flag to skip execution and artifacts archiving for certain projects only")
      .option("--skipParallelCheckout", "Checkout the project sequentially", false)
      .option("-t, --customCommandTreatment <exp...>", "Each exp must be of the form <RegEx||ReplacementEx>. Regex defines the regular expression for what you want to replace with the ReplacementEx")
      .option("--skipProjectCheckout <projects...>", "A list of projects to skip checkout.")
      .option("--skipCheckout", "skip checkout for all projects. Overrides skipProjectCheckout", false)
      .action((options) => {
        const parsedInputs = Container.get(InputService);
        if (options.debug) options.loggerLevel = LoggerLevel.DEBUG;
        delete options.debug;
        parsedInputs.updateInputs({ ...options, CLICommand: CLIActionType.BUILD, CLISubCommand: buildType });
      });
  }

  /**
   * Constructs the parsers for all the commands available
   * @returns {Command[]} Array of objects of command line parsers
   */
  static getAllCommands(): Command[] {
    return Object.keys(FlowType).map((buildType) => this.getCommand(FlowType[buildType as keyof typeof FlowType]));
  }
}
