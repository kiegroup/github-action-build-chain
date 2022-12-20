import { LoggerLevel } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
import { Logger } from "@bc/service/logger/logger";
import Container from "typedi";

export abstract class BaseLoggerService {

  private readonly _logger: Logger;
  private readonly input: InputService;

  protected constructor() {
    this._logger = new Logger();
    this.input = Container.get(InputService);
  }

  abstract startGroup(message: string): void;

  abstract endGroup(): void;

  public debug(message: string): void {
    if (this.input.inputs.loggerLevel == LoggerLevel.DEBUG) {
      this._logger.log("[DEBUG]", message);
    }
  }

  public info(message: string): void {
    this._logger.log("[INFO]", message);
  }

  public trace(message: string): void {
    if (this.input.inputs.loggerLevel == LoggerLevel.TRACE) {
      this._logger.log("[TRACE]", message);
    }
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