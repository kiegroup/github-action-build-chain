import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { CLIActionType, BuildActionType } from "@bc/domain/cli";

/**
 * Create single pull request flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class SinglePullRequestCommand implements CommandConstructor {
    createCommand(): Command {
        const program = new Command(`${CLIActionType.BUILD} ${BuildActionType.SINGLE_PULL_REQUEST}`);
        program
            .description('Execute single pull request build chain workflow')
            .requiredOption('-u, --url <event_url>', 'pull request event url')
            .option('-p, --startProject <project>', 'The project to start the build from');
            
        return program;
    }
}