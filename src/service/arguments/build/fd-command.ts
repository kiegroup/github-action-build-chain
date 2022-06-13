import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { CLIActionType, BuildActionType } from "@bc/domain/cli";

/**
 * Create full downstream flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class FullDownstreamCommand implements CommandConstructor {
    createCommand(): Command {
        const program = new Command(`${CLIActionType.BUILD} ${BuildActionType.FULL_DOWNSTREAM}`);
        program
            .description('Execute full downstream build chain workflow')
            .requiredOption('-u, --url <event_url>', 'full downstream event url')
            .option('-p, --startProject <project>', 'The project to start the build from');    
                    
        return program;
    }
}