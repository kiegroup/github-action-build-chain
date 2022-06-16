import { Service } from "typedi";
import { BashExecutor } from "@bc/service/command/executor/bash-executor";
import { ExportExecutor } from "@bc/service/command/executor/export-executor";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

@Service()
export class CommandExecutorDelegator {

  private _bashExecutor: BashExecutor;
  private _exportExecutor: ExportExecutor;

  constructor(bashExecutor: BashExecutor,
              exportExecutor: ExportExecutor) {
    this._bashExecutor = bashExecutor;
    this._exportExecutor = exportExecutor;
  }

  public async executeCommand(command: string, cwd?: string): Promise<ExecuteCommandResult> {
    const startHrTime = process.hrtime();
    const startingDate = Date.now();

    try {
      this.isExport(command) ? await this._exportExecutor.execute(command, cwd) : await this._bashExecutor.execute(command, cwd);
      return {
        startingDate,
        endingDate: Date.now(),
        time: this.hrtimeToMs(startHrTime),
        result: ExecutionResult.OK,
        command: command,
      };
    } catch (ex) {
      const errorMessage = (ex instanceof Error) ? ex.message : "unknown";
      LoggerServiceFactory.getInstance().error(`Error executing command ${command}. ${errorMessage}`);
      return {
        startingDate,
        endingDate: Date.now(),
        time: this.hrtimeToMs(startHrTime),
        result: ExecutionResult.NOT_OK,
        errorMessage,
        command: command,
      };
    }
  }

  private isExport(command: string): boolean {
    return command.trim().match(/^export .*=/) !== null;
  }

  private hrtimeToMs(startHrTime: [number, number], endHrTime: [number, number] = process.hrtime(startHrTime)): number {
    return endHrTime[0] * 1000 + endHrTime[1] / 1000000;
  }

}