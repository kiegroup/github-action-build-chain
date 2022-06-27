import { LoggerService } from "@bc/service/logger/logger-service";
import { TestLoggerService } from "@bc/service/logger/__mocks__/test-logger-service";
jest.mock("@bc/service/logger/__mocks__/test-logger-service");

export class LoggerServiceFactory {
  private static instance: LoggerService;

  public static getInstance(): LoggerService {
    if (LoggerServiceFactory.instance === undefined) {
      LoggerServiceFactory.instance = jest.mocked<TestLoggerService>(TestLoggerService.prototype, true);
    }
    return LoggerServiceFactory.instance;
  }
}