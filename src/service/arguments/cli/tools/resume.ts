import { Command } from "commander";
import { CommandConstructor } from "@bc/service/arguments/cli/command-constructor";
import { ToolType } from "@bc/domain/cli";
import Container from "typedi";
import { InputService } from "@bc/service/inputs/input-service";

/**
 * Create command parser for project list tool
 * @implements {CommandConstructor}
 */
export class ResumeCommand implements CommandConstructor {
  createCommand(): Command {
    const program = new Command(ToolType.RESUME);
    program
      .description("Resume execution from first point of failure")
      .option("-w, --workspace <workspace>", "The workspace in which build-chain was executed and the one you want to resume execution in")
      .hook("postAction", () => {
        const parsedInputs = Container.get(InputService);
        parsedInputs.updateInputs({ outputFolder: parsedInputs.inputs.workspace });
      });
    return program;
  }
}
