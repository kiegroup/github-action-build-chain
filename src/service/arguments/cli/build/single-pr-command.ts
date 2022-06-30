import { BuildActionType } from "@bc/domain/cli";
import { AbstractPullRequestCommand } from "@bc/service/arguments/cli/build/abstract-pr-command";

/**
 * Create single pull request flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class SinglePullRequestCommand extends AbstractPullRequestCommand {
    constructor () {
        const description: string = "Execute single pull request build chain workflow";
        const type: BuildActionType = BuildActionType.SINGLE_PULL_REQUEST;
        super(description, type)
    }
}