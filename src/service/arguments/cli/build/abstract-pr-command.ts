import { CLIActionType } from "@bc/domain/cli";
import { FlowType } from "@bc/domain/inputs";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { Command } from "commander";

export abstract class AbstractPullRequestCommand implements CommandConstructor {
  private readonly description: string;
  private readonly type: FlowType;

  constructor(description: string, type: FlowType) {
    this.description = description;
    this.type = type;
  }

  createCommand(): Command {
    return new Command(this.type)
      .description(this.description)
      .requiredOption("-u, --url <event_url>", "pull request event url")
      .option("-p, --startProject <project>", "The project to start the build from");
  }
}
