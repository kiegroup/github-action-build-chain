import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { CLIActionType, BuildActionType } from "@bc/domain/cli";

/**
 * Create branch flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class BranchCommand implements CommandConstructor {
    createCommand(): Command {
        const program = new Command(`${CLIActionType.BUILD} ${BuildActionType.BRANCH}`);
        program
            .description('Execute branch build chain workflow')
            .requiredOption('-p, --startProject <project>', 'The project to start the build from')
            .requiredOption('-b, --branch <branch>', 'The branch to get the project from')
            .option('--fullProjectDependencyTree', 'Checks out and execute the whole tree instead of the upstream build', false);
            
        return program;
    }
}