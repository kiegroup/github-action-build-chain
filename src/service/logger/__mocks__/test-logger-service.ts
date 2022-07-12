/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AbstractLoggerService } from "@bc/service/logger/abstract-logger-service";

export class TestLoggerService extends AbstractLoggerService {

  constructor() {
    super();
  }

  endGroup(): void {
  }

  startGroup(_message: string): void {
  }

  public debug(_message: string): void {
  }

  public info(_message: string): void {
  }

  public trace(_message: string): void {
  }

  public warn(_message: string): void {
  }

  public error(_message: string): void {
  }
}