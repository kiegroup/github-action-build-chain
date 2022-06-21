import { BuildActionType } from "@bc/domain/cli";
import { AbstractPullRequestCommand } from "@bc/service/arguments/build/abstract-pr-command";

/**
 * Create full downstream flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class FullDownstreamCommand extends AbstractPullRequestCommand {
    constructor () {
        const description: string = "Execute full downstream build chain workflow";
        const type: BuildActionType = BuildActionType.FULL_DOWNSTREAM;
        super(description, type)
    }
}