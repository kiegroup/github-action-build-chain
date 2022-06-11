/* eslint-disable no-console */
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import * as core from "@actions/core";

console.log = jest.fn();
jest.mock("@actions/core");

describe("cli logger service", () => {
  test("info", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.info("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[INFO]", "whatever the message");
  });

  test("trace", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.trace("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[TRACE]", "whatever the message");
  });

  test("warn", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.warn("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[WARN]", "whatever the message");
  });

  test("debug", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.debug("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("[DEBUG]", "whatever the message");
  });

  test("startGroup", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.startGroup("whatever the message");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(0);
    expect(core.startGroup("whatever the message"));
  });

  test("endGroup", () => {
    // Arrange
    const loggerService = new GithubActionLoggerService();

    // Act
    loggerService.endGroup();

    // Assert
    expect(console.log).toHaveBeenCalledTimes(0);
    expect(core.endGroup());
  });
});