import { CLIActionType } from "@bc/domain/cli";
import { FlowType } from "@bc/domain/inputs";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { Command } from "commander";

export abstract class AbstractPullRequestCommand implements CommandConstructor {
  private readonly description: string;
  private readonly type: FlowType;
  private readonly alias: string;

  constructor(description: string, type: FlowType, alias: string) {
    this.description = description;
    this.type = type;
    this.alias = alias;
  }

  createCommand(): Command {
    return new Command(this.type)
      .alias(this.alias) // adding deprecated alias for backward compatibility. Keep until full compatibility is reached with existing ci
      .description(this.description)
      .requiredOption("-u, --url <event_url>", "pull request event url")
      .option("-p, --startProject <project>", "The project to start the build from");
  }
}
