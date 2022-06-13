import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { CLIActionType, BuildActionType } from "@bc/domain/cli";

/**
 * Create cross pull request flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class CrossPullRequestCommand implements CommandConstructor {
    createCommand(): Command {
        const program = new Command(`${CLIActionType.BUILD} ${BuildActionType.CROSS_PULL_REQUEST}`);
        program
            .description('Execute cross pull request build chain workflow')
            .requiredOption('-u, --url <event_url>', 'cross pull request event url')
            .option('-p, --startProject <project>', 'The project to start the build from');
            
        return program;
    }
}