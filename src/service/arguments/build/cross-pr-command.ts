import { BuildActionType } from "@bc/domain/cli";
import { AbstractPullRequestCommand } from "@bc/service/arguments/build/abstract-pr-command";

/**
 * Create cross pull request flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class CrossPullRequestCommand extends AbstractPullRequestCommand {
    constructor () {
        const description: string = "Execute cross pull request build chain workflow";
        const type: BuildActionType = BuildActionType.CROSS_PULL_REQUEST;
        super(description, type)
    }
}