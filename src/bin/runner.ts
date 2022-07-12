import "reflect-metadata";
import { EntryPoint } from "@bc/domain/entry-point";
import { Container } from "typedi";
import { constants } from "@bc/domain/constants";
import { ConfigurationService } from "@bc/service/config/configuration-service";

export abstract class Runner {

  async initializeConfig(): Promise<void> {
    const configService = Container.get(ConfigurationService);
    await configService.init();
  }

  constructor(entryPoint: EntryPoint) {
    Container.set(constants.CONTAINER.ENTRY_POINT, entryPoint);
  }

  async execute(): Promise<void> {
    await this.initializeConfig();
    // TODO: to implement
  }

  // TODO: to define and implement runFLow and postExecutionAction
}

