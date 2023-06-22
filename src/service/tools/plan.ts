import { ExecutionResult } from "@bc/domain/execute-command-result";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { GitCLIService } from "@bc/service/git/git-cli";
import { Tools } from "@bc/service/tools/abstract-tools";
import { InputService } from "@bc/service/inputs/input-service";
import Container from "typedi";
import { CLIActionType } from "@bc/domain/cli";
import { CLIRunner } from "@bc/bin/runners/cli-runner";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { Command } from "commander";

export class Plan extends Tools {
  async execute(): Promise<void> {
    // add DRY_RUN annotation before all console logs
    // eslint-disable-next-line no-console
    const original = console.log;
    // eslint-disable-next-line no-console
    console.log = (...args: string[]) => {
      original("[DRY_RUN]", ...args);
    };

    // patch git cli service to do no cloning, merging or renaming
    const git = Container.get(GitCLIService);
    git.clone = async () => undefined;
    git.merge = async () => undefined;
    git.rename = async () => undefined;
    Container.set(GitCLIService, git);

    // patch command executor to not execute a command
    const commandExecutor = Container.get(CommandExecutorDelegator);
    commandExecutor.executeCommand = async cmd => {
      this.logger.logger.log(`Executed ${cmd}`);
      return {
        startingDate: Date.now(),
        endingDate: Date.now(),
        time: 0,
        command: cmd,
        result: ExecutionResult.OK,
        errorMessage: "",
      };
    };
    Container.set(CommandExecutorDelegator, commandExecutor);

    // update input to make it not look like a tool subcommand execution
    const inputService = Container.get(InputService);
    inputService.updateInputs({
      CLICommand: CLIActionType.BUILD,
      CLISubCommand: inputService.inputs.flowType!,
    });

    // patch cli argument service to prevent argument parsing again
    const args = Container.get(CLIArguments);
    args.getCommand = () => ({ parse: () => undefined! } as unknown as Command);
    Container.set(CLIArguments, args);

    // re-run cli runner
    return new CLIRunner().execute();
  }
}
