import "reflect-metadata";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { Container } from "typedi";
import { ConfigurationService } from "@bc/service/configuration-service";
import { EntryPoint } from "@bc/domain/entry-point";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";

describe("logger factory getInstance", () => {
  const configurationGetterSpy = jest.spyOn(Container.get(ConfigurationService), "configuration", "get");

  afterEach(() => {
    LoggerServiceFactory.clearInstance();
  });

  test("CLI", () => {
    // Arrange
    configurationGetterSpy.mockReturnValueOnce({ entryPoint: EntryPoint.CLI });

    // Act
    const result = LoggerServiceFactory.getInstance();

    // Assert
    expect(result).toBeInstanceOf(CLILoggerService);
  });

  test("Github", () => {
    // Arrange
    configurationGetterSpy.mockReturnValueOnce({ entryPoint: EntryPoint.GITHUB_EVENT });

    // Act
    const result = LoggerServiceFactory.getInstance();

    // Assert
    expect(result).toBeInstanceOf(GithubActionLoggerService);
  });

  test("Configuration undefined", () => {
    // Arrange
    configurationGetterSpy.mockReturnValueOnce(undefined);

    // Act
    try {
      LoggerServiceFactory.getInstance();
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe("No LoggerService defined for undefined");
    }
  });

  test("Error", () => {
    // Arrange
    configurationGetterSpy.mockReturnValueOnce({ entryPoint: 3 });

    // Act
    try {
      LoggerServiceFactory.getInstance();
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe("No LoggerService defined for undefined");
    }
  });

});

