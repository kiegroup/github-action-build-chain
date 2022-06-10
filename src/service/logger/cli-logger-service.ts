import { AbstractLoggerService } from "@bc/service/logger/abstract-logger-service";

export class CLILoggerService extends AbstractLoggerService {

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