import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { ToolType } from "@bc/domain/cli";

/**
 * Create command parser for project list tool
 * @implements {CommandConstructor}
 */
export class ProjectListCommand implements CommandConstructor {
  createCommand(): Command {
    const program = new Command(ToolType.PROJECT_LIST);
    program
      .description("Prints the projects that will be built given a starting project ordered by precedence")
      .requiredOption("-p, --startProject <project>", "The project to start the build from")
      .option("--fullProjectDependencyTree", "Checks out and execute the whole tree instead of the upstream build", false);

    return program;
  }
}
