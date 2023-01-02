import { BaseLoggerService } from "@bc/service/logger/base-logger-service";

export class CLILoggerService extends BaseLoggerService {

  constructor() {
    super();
  }

  endGroup(): void {
    super.logger.emptyLine();
  }

  startGroup(message: string): void {
    super.logger.log("#", message);
  }
}