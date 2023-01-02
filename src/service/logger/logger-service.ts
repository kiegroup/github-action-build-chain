import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import Container, { Service } from "typedi";

@Service()
export class LoggerService {
  private _logger: BaseLoggerService;

  constructor() {
    const entryPoint = Container.get(constants.CONTAINER.ENTRY_POINT);
    switch (entryPoint) {
      case EntryPoint.CLI:
        this._logger = new CLILoggerService();
        break;
      case EntryPoint.GITHUB_EVENT:
        this._logger = new GithubActionLoggerService();
        break;
      default:
        throw new Error(`No LoggerService defined for ${entryPoint}`);
    }
  }

  get logger() {
    return this._logger;
  }
}