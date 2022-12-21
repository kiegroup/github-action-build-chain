import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { CLIActionType } from "@bc/domain/cli";
import { FlowType } from "@bc/domain/inputs";

/**
 * Create branch flow sub-subcommand for build subcommand
 * @implements {CommandConstructor}
 */
export class BranchCommand implements CommandConstructor {
  createCommand(): Command {
    const program = new Command(FlowType.BRANCH);
    program
      .description("Execute branch build chain workflow")
      .requiredOption("-p, --startProject <project>", "The project to start the build from")
      .requiredOption("-b, --branch <branch>", "The branch to get the project from")
      .option("--fullProjectDependencyTree", "Checks out and execute the whole tree instead of the upstream build", false)
      .option("-c, --command <commands...>", "The command(s) to execute for every project. This will override definition file configuration (just dependency tree will be taken into account)")
      .option("-g, --group <group>", "The group to execute flow. It will take it from project argument in case it's not specified");

    return program;
  }
}
