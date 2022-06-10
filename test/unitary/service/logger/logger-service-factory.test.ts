import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { ConfigurationService } from "@bc/service/configuration-service";

jest.mock("@bc/service/configuration-service")

describe("logger factory getInstance", () => {

  beforeEach(() => {
    // assign the mock jest.fn() to static method
    ConfigurationService.getInstance = jest.impl;
  });

  test("CLI", () => {
    // Arrange
    consfigurationServiceMock.
    // Act
    const result = LoggerServiceFactory.getInstance();

    // Assert
    expect(ConfigurationService.getInstance()).toHaveBeenCalledTimes(1);
    // expect(result).toBeInstanceOf(CLILoggerService);
  });
});