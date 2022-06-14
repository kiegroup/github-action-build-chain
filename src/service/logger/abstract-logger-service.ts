import { Logger } from "@bc/service/logger/logger";
import { LoggerService } from "@bc/service/logger/logger-service";

export abstract class AbstractLoggerService implements LoggerService {

  private readonly _logger: Logger;

  protected constructor() {
    this._logger = new Logger();
  }

  abstract startGroup(message: string): void;

  abstract endGroup(): void;

  public debug(message: string): void {
    this._logger.log("[DEBUG]", message);
  }

  public info(message: string): void {
    this._logger.log("[INFO]", message);
  }

  public trace(message: string): void {
    this._logger.log("[TRACE]", message);
  }

  public warn(message: string): void {
    this._logger.log("[WARN]", message);
  }

  public error(message: string): void {
    this._logger.log("[ERROR]", message);
  }

  get logger(): Logger {
    return this._logger;
  }
}