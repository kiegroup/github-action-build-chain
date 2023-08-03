import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { CLIActionType, ToolType } from "@bc/domain/cli";
import Container from "typedi";
import { InputService } from "@bc/service/inputs/input-service";
import { LoggerLevel } from "@bc/domain/inputs";

/**
 * Create command parser for resume
 * 
 * Note that we are setting resume as a tool type command in the parsedInputs even though we are defining
 * it with the build subcommand. This is because we want run `build-chain build resume` as it is more 
 * intuitive than `build-chain build resume`. However internally we still need it to act as a tool because
 * it doesn't follow the usual build process. Hence we set resume as a tools command as part of the parsed inputs
 * internally.
 * 
 * @implements {CommandConstructor}
 */
export class ResumeCommand implements CommandConstructor {
  createCommand(): Command {
    const program = new Command(ToolType.RESUME);
    program
      .description("Resume execution from first point of failure in the previous execution")
      .option("-w, --workspace <workspace>", "The workspace in which build chain was executed and the one to resume execution in")
      .option("-t, --token <token>", "The GITHUB_TOKEN. It can be set as an environment variable instead")
      .option("-d, --debug", "Set debugging mode to true", false)
      .option("-p, --startProject <project>", "Start from the given project instead of the first point of failure", false)
      .action(options => {
        const parsedInputs = Container.get(InputService);
        if (options.debug) {
          options.loggerLevel = LoggerLevel.DEBUG;
        }
        delete options.debug;
        parsedInputs.updateInputs({ 
          ...options, 
          CLICommand: CLIActionType.TOOLS,
          CLISubCommand: ToolType.RESUME, 
          outputFolder: options.workspace 
        });
      })
    return program;
  }
}
