import "reflect-metadata";

export abstract class Runner {

  abstract initializeConfig(): void;

  execute(): void {
    this.initializeConfig();
    // TODO: to implement
  }

  // TODO: to define and implement runFLow and postExecutionAction
}

