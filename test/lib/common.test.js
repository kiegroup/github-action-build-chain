const { logger } = require("../../src/lib/common");

describe("logger", () => {
  const log = console.log;
  beforeEach(() => {
    console.log = jest.fn();
    logger.level = "info";
  });
  afterAll(() => {
    console.log = log;
  });

  test("emptyLine", () => {
    // Act
    logger.emptyLine();

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith();
  });

  test("info", () => {
    // Act
    logger.info("test info");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[INFO] ", "test info");
  });

  test("warn", () => {
    // Act
    logger.warn("test warn");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[WARN] ", "test warn");
  });

  test("debug enabled", () => {
    // Arrange
    logger.level = "debug";

    // Act
    logger.debug("test debug enabled");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[DEBUG] ", "test debug enabled");
  });

  test("debug disabled", () => {
    // Act
    logger.debug("test debug disabled");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(0);
  });

  test("trace enabled", () => {
    // Arrange
    logger.level = "trace";

    // Act
    logger.trace("test trace enabled");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[TRACE] ", "test trace enabled");
  });

  test("trace disabled", () => {
    // Act
    logger.trace("test trace disabled");

    // Assert
    expect(console.log).toHaveBeenCalledTimes(0);
  });

  test("isDebug enabled", () => {
    // Arrange
    logger.level = "debug";

    // Act
    const result = logger.isDebug();

    // Assert
    expect(result).toBe(true);
  });

  test("isDebug disabled", () => {
    // Act
    const result = logger.isDebug();

    // Assert
    expect(result).toBe(false);
  });
});
