import { ExecuteCommandResult } from "@bc/domain/execute-command-result";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import Container from "typedi";

export abstract class PrePostExecutor {
  protected configService: ConfigurationService;
  protected logger: BaseLoggerService;
  protected executeService: ExecuteCommandService;

  constructor() {
    this.configService = Container.get(ConfigurationService);
    this.logger = Container.get(LoggerService).logger;
    this.executeService = Container.get(ExecuteCommandService);
  }

  protected async execute(cmds: string | string[]): Promise<ExecuteCommandResult[]> {
    const result: ExecuteCommandResult[] = [];
    if (Array.isArray(cmds)) {
      for (const cmd of cmds) {
        result.push(await this.executeService.executeCommand(cmd, {cwd: process.cwd()}));
      }
    } else {
      result.push(await this.executeService.executeCommand(cmds, {cwd: process.cwd()}));
    }
    return result;
  }
}
