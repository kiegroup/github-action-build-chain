/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AbstractLoggerService } from "@bc/service/logger/abstract-logger-service";

export class TestLoggerService extends AbstractLoggerService {

  constructor() {
    super();
  }

  endGroup(): void {
  }

  startGroup(message: string): void {
  }

  public debug(message: string): void {
  }

  public info(message: string): void {
  }

  public trace(message: string): void {
  }

  public warn(message: string): void {
  }

  public error(message: string): void {
  }
}