import { FlowType } from "@bc/domain/inputs";
import { AbstractPullRequestCommand } from "@bc/service/arguments/cli/build/abstract-pr-command";

/**
 * Create cross pull request flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class CrossPullRequestCommand extends AbstractPullRequestCommand {
  constructor() {
    const description: string = "Execute cross pull request build chain workflow";
    const type: FlowType = FlowType.CROSS_PULL_REQUEST;
    super(description, type);
  }
}
