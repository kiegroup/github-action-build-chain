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
      .description("Prints a ordered  by precendence list of projects")
      .option("-s, --skipGroup <group_names...>", "Remove group from project list");
    return program;
  }
}
