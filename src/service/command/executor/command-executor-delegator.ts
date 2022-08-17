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
    const startingDate = Date.now();
    let result: ExecutionResult;
    let errorMessage = "";
    
    try {
      this.isExport(command) ? await this._exportExecutor.execute(command, cwd) : await this._bashExecutor.execute(command, cwd);
      result = ExecutionResult.OK;
    } catch (ex) {
      errorMessage = (ex instanceof Error) ? ex.message : "unknown";
      LoggerServiceFactory.getInstance().error(`Error executing command ${command}. ${errorMessage}`);
      result = ExecutionResult.NOT_OK;
    }
    return {
      startingDate,
      command,
      result,
      errorMessage,
      endingDate: Date.now(),
      time: hrtimeToMs(startHrTime),
    };
  }

  private isExport(command: string): boolean {
    return command.trim().match(/^export .*=/) !== null;
  }
}