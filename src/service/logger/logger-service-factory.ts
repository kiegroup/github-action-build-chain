import { LoggerService } from "@bc/service/logger/logger-service";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import { Container } from "typedi";
import { constants } from "@bc/domain/constants";

export class LoggerServiceFactory {

  private static instance?: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerServiceFactory.instance) {
      const entryPoint: EntryPoint = Container.get(constants.CONTAINER.ENTRY_POINT);
      switch (entryPoint) {
        case EntryPoint.CLI:
          LoggerServiceFactory.instance = new CLILoggerService();
          break;
        case EntryPoint.GITHUB_EVENT:
          LoggerServiceFactory.instance = new GithubActionLoggerService();
          break;
        default:
          throw new Error(`No LoggerService defined for ${entryPoint}`);
      }
    }
    return LoggerServiceFactory.instance;
  }

  public static clearInstance(): void {
    LoggerServiceFactory.instance = undefined;
  }
}