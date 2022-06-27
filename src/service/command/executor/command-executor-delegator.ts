import { Service } from "typedi";
import { BashExecutor } from "@bc/service/command/executor/bash-executor";
import { ExportExecutor } from "@bc/service/command/executor/export-executor";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { hrtimeToMs } from "@bc/utils/date";

@Service()
export class CommandExecutorDelegator {

  constructor(private _bashExecutor: BashExecutor,
              private _exportExecutor: ExportExecutor) {
  }

  public async executeCommand(command: string, cwd?: string): Promise<ExecuteCommandResult> {
    const startHrTime = process.hrtime();
    let result: ExecuteCommandResult = {
      startingDate: Date.now(),
      command: command,
    };

    try {
      this.isExport(command) ? await this._exportExecutor.execute(command, cwd) : await this._bashExecutor.execute(command, cwd);
      result = {
        ...result,
        result: ExecutionResult.OK,
      };
    } catch (ex) {
      const errorMessage = (ex instanceof Error) ? ex.message : "unknown";
      LoggerServiceFactory.getInstance().error(`Error executing command ${command}. ${errorMessage}`);
      result = {
        ...result,
        result: ExecutionResult.NOT_OK,
        errorMessage,
      };
    }
    return {
      ...result,
      time: hrtimeToMs(startHrTime),
    };
  }

  private isExport(command: string): boolean {
    return command.trim().match(/^export .*=/) !== null;
  }
}