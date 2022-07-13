import { FlowType } from "@bc/domain/inputs";
import { AbstractPullRequestCommand } from "@bc/service/arguments/cli/build/abstract-pr-command";

/**
 * Create single pull request flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class SinglePullRequestCommand extends AbstractPullRequestCommand {
  constructor() {
    const description: string = "Execute single pull request build chain workflow";
    const type: FlowType = FlowType.SINGLE_PULL_REQUEST;
    super(description, type);
  }
}
