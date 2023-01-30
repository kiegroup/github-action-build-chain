import { FlowType } from "@bc/domain/inputs";
import { AbstractPullRequestCommand } from "@bc/service/arguments/cli/build/abstract-pr-command";

/**
 * Create full downstream flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class FullDownstreamCommand extends AbstractPullRequestCommand {
  constructor() {
    const description: string = "Execute full downstream build chain workflow";
    const type: FlowType = FlowType.FULL_DOWNSTREAM;
    super(description, type, "fd");
  }
}
