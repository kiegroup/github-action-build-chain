import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
/* eslint-disable no-console */
console.log = jest.fn();

describe("cli logger service", () => {
  test("info", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.info("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[INFO]", "whatever the message");
  });

  test("trace", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.trace("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[TRACE]", "whatever the message");
  });

  test("warn", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.warn("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[WARN]", "whatever the message");
  });

  test("debug", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.debug("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[DEBUG]", "whatever the message");
  });

  test("startGroup", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.startGroup("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("#", "whatever the message");
  });

  test("endGroup", () => {
    // Arrange
    const loggerService = new CLILoggerService();

    // Act
    loggerService.endGroup();

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("", "");
  });
});