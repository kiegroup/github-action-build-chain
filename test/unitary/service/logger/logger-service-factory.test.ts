import "reflect-metadata";
import { LoggerService } from "@bc/service/logger/logger-service";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { EntryPoint } from "@bc/domain/entry-point";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import { Container } from "typedi";
import { constants } from "@bc/domain/constants";

describe("logger factory getInstance", () => {
  beforeEach(() => {
    Container.reset();
  });
  
  test("CLI", () => {
    // Arrange
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

    // Act
    const result = Container.get(LoggerService).logger;

    // Assert
    expect(result).toBeInstanceOf(CLILoggerService);
  });

  test("Github", () => {
    // Arrange
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);

    // Act
    const result = Container.get(LoggerService).logger;

    // Assert
    expect(result).toBeInstanceOf(GithubActionLoggerService);
  });

  test("Error", () => {
    // Arrange
    Container.set(constants.CONTAINER.ENTRY_POINT, 3);

    // Act
    try {
      Container.get(LoggerService).logger;
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe("No LoggerService defined for 3");
    }
  });
});
