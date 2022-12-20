import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import * as core from "@actions/core";

export class GithubActionLoggerService extends BaseLoggerService {

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