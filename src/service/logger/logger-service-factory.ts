import { LoggerService } from "@bc/service/logger/logger-service";
import { ConfigurationService } from "@bc/service/configuration-service";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import { Container } from "typedi";

export class LoggerServiceFactory {

  private static instance?: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerServiceFactory.instance) {
      switch (Container.get(ConfigurationService).configuration?.entryPoint) {
        case EntryPoint.CLI:
          LoggerServiceFactory.instance = new CLILoggerService();
          break;
        case EntryPoint.GITHUB_EVENT:
          LoggerServiceFactory.instance = new GithubActionLoggerService();
          break;
        default:
          throw new Error(`No LoggerService defined for ${Container.get(ConfigurationService).configuration?.entryPoint}`);
      }
    }
    return LoggerServiceFactory.instance;
  }

  public static clearInstance(): void {
    LoggerServiceFactory.instance = undefined;
  }
}