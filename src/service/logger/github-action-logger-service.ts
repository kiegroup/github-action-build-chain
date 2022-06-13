import { AbstractLoggerService } from "@bc/service/logger/abstract-logger-service";
import * as core from "@actions/core";

export class GithubActionLoggerService extends AbstractLoggerService {

  constructor() {
    super();
  }

  endGroup(): void {
    core.endGroup();
  }

  startGroup(message: string): void {
    core.startGroup(message);
  }
}