import { ConfigurationService } from "@bc/service/config/configuration-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import Container from "typedi";

export abstract class Tools {
  protected logger: BaseLoggerService;
  protected configService: ConfigurationService;

  constructor() {
    this.configService = Container.get(ConfigurationService);
    this.logger = Container.get(LoggerService).logger;
  }

  abstract execute(): Promise<void>;
}