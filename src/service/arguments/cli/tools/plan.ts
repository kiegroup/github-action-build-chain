import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { CLIActionType, ToolType } from "@bc/domain/cli";
import { BuildSubCommandFactory } from "@bc/service/arguments/cli/build/build-subcommand-factory";
import Container from "typedi";
import { InputService } from "@bc/service/inputs/input-service";
import { FlowType } from "@bc/domain/inputs";

/**
 * Create command parser for project list tool
 * @implements {CommandConstructor}
 */
export class PlanCommand implements CommandConstructor {
  createCommand(): Command {
    const program = new Command(ToolType.PLAN);
    program
      .description("Execute build chain without actually cloning or executing projects (like a dry run)")
      .hook("postAction", () => {
        const parsedInputs = Container.get(InputService);
        const flowType = parsedInputs.inputs.CLISubCommand as FlowType;
        parsedInputs.updateInputs({ flowType: flowType, CLICommand: CLIActionType.TOOLS, CLISubCommand: ToolType.PLAN });
      });
    
    BuildSubCommandFactory.getAllCommands().forEach(cmd => program.addCommand(cmd));
    
    // program
    return program;
  }
}
