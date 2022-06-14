import { Logger } from "@bc/service/logger/logger";

/* eslint-disable no-console */
console.log = jest.fn();

describe("Logger.log", () => {
  test("prefix", () => {
    // Arrange
    const logger = new Logger();
    // Act
    logger.log("A");

    // Arrange
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("A");
  });

  test("prefix and 1 message", () => {
    // Arrange
    const logger = new Logger();
    // Act
    logger.log("A", "B");

    // Arrange
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("A", "B");
  });

  test("prefix and 2 messages", () => {
    // Arrange
    const logger = new Logger();
    // Act
    logger.log("A", "B", "C");

    // Arrange
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("A", "B", "C");
  });
});
describe("Logger.emptyLine", () => {
  test("ok", () => {
    // Arrange
    const logger = new Logger();
    // Act
    logger.emptyLine();

    // Arrange
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toBeCalledWith("", "");
  });
});