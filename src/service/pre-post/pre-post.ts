import { ExecuteCommandResult } from "@bc/domain/execute-command-result";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import Container from "typedi";

export abstract class PrePostExecutor {
  protected configService: ConfigurationService;
  protected logger: LoggerService;
  protected executeService: ExecuteCommandService;

  constructor() {
    this.configService = Container.get(ConfigurationService);
    this.logger = LoggerServiceFactory.getInstance();
    this.executeService = Container.get(ExecuteCommandService);
  }

  protected async execute(cmds: string | string[]): Promise<ExecuteCommandResult[]> {
    const result: ExecuteCommandResult[] = [];
    if (Array.isArray(cmds)) {
      for (const cmd of cmds) {
        result.push(await this.executeService.executeCommand(cmd, process.cwd()));
      }
    } else {
      result.push(await this.executeService.executeCommand(cmds, process.cwd()));
    }
    return result;
  }
}
