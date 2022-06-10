import { LoggerService } from "@bc/service/logger/logger-service";
import { ConfigurationService } from "@bc/service/configuration-service";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";

export class LoggerServiceFactory {

  private static instance?: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerServiceFactory.instance) {
      switch (ConfigurationService.getInstance().configuration.entryPoint) {
        case EntryPoint.CLI:
          LoggerServiceFactory.instance = new CLILoggerService();
          break;
        case EntryPoint.GITHUB_EVENT:
          LoggerServiceFactory.instance = new GithubActionLoggerService();
          break;
        default:
          throw new Error(`No LoggerService defined for ${ConfigurationService.getInstance().configuration.entryPoint}`);
      }
    }
    return LoggerServiceFactory.instance;
  }
}