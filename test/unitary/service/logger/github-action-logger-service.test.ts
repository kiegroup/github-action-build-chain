/* eslint-disable no-console */
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import * as core from "@actions/core";
import { Logger } from "@bc/service/logger/logger";

jest.mock("@actions/core");
jest.mock("@bc/service/logger/logger");


describe("cli logger service", () => {
  test("info", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.info("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[INFO]", "whatever the message");
  });

  test("trace", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.trace("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[TRACE]", "whatever the message");
  });

  test("warn", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.warn("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[WARN]", "whatever the message");
  });

  test("debug", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.debug("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[DEBUG]", "whatever the message");
  });

  test("error", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.error("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toBeCalledWith("[ERROR]", "whatever the message");
  });

  test("startGroup", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.startGroup("whatever the message");

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(0);
    expect(core.startGroup).toHaveBeenCalledWith("whatever the message");
  });

  test("endGroup", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.endGroup();

    // Assert
    expect(Logger.prototype.log).toHaveBeenCalledTimes(0);
    expect(core.endGroup).toHaveBeenCalledTimes(1);
  });
});