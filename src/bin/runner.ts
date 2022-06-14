import "reflect-metadata";
import { EntryPoint } from "@bc/domain/entry-point";
import { Container } from "typedi";
import { constants } from "@bc/domain/constants";

export abstract class Runner {

  abstract initializeConfig(): void;

  constructor(entryPoint: EntryPoint) {
    Container.set(constants.CONTAINER.ENTRY_POINT, entryPoint);
  }

  execute(): void {
    this.initializeConfig();
    // TODO: to implement
  }

  // TODO: to define and implement runFLow and postExecutionAction
}

