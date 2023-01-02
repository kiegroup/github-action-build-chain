import "reflect-metadata";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { Logger } from "@bc/service/logger/logger";
import { defaultInputValues, LoggerLevel } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";

jest.mock("@bc/service/logger/logger");

describe("cli logger service", () => {
  test("info", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.info("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[INFO]", "whatever the message");
  });

  test.each([
    ["logger level is trace", LoggerLevel.TRACE, 1, ["[TRACE]", "whatever the message"]], 
    ["logger level is not trace", LoggerLevel.INFO, 0, []], 
  ])("trace - %p", (_title: string, loggerLevel: LoggerLevel, numCalls: number, args: string[]) => {
    jest.spyOn(InputService.prototype, "inputs", "get").mockReturnValueOnce({...defaultInputValues, loggerLevel});

    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.trace("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(numCalls);
    if (args.length > 0) {
      expect(Logger.prototype.log).toBeCalledWith(...args);
    }
  });

  test("warn", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.warn("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[WARN]", "whatever the message");
  });

  test.each([
    ["logger level is debug", LoggerLevel.DEBUG, 1, ["[DEBUG]", "whatever the message"]], 
    ["logger level is not debug", LoggerLevel.INFO, 0, []], 
  ])("debug - %p", (_title: string, loggerLevel: LoggerLevel, numCalls: number, args: string[]) => {
    jest.spyOn(InputService.prototype, "inputs", "get").mockReturnValueOnce({...defaultInputValues, loggerLevel});

    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.debug("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(numCalls);
    if (args.length > 0) {
      expect(Logger.prototype.log).toBeCalledWith(...args);
    }
  });

  test("error", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.error("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[ERROR]", "whatever the message");
  });

  test("startGroup", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.startGroup("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("#", "whatever the message");
  });

  test("endGroup", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.endGroup();

    // Assert
    expect(Logger.prototype.emptyLine).toHaveBeenCalledTimes(1);
  });
});