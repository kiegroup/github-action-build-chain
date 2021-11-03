const {
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  getLoggerLevel,
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  eventFlowTypeToCliFlowType,
  getAnnotationsPrefix
} = require("../../../src/lib/util/action-utils");

const { getInput } = require("@actions/core");
jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

test("getDefinitionFile", () => {
  // Arrange
  const expectedResult = "./whateverfile";
  getInput.mockImplementationOnce(param =>
    param === "definition-file" ? expectedResult : undefined
  );
  // Act
  const result = getDefinitionFile();

  // Assert
  expect(result).toEqual(expectedResult);
});

test("getStartingProject", () => {
  // Arrange
  const expectedResult = "projectx";
  getInput.mockImplementationOnce(param =>
    param === "starting-project" ? expectedResult : undefined
  );
  // Act
  const result = getStartingProject();

  // Assert
  expect(result).toEqual(expectedResult);
});

describe("getAnnotationsPrefix", () => {
  test("defined", () => {
    // Arrange
    const expectedResult = "Java 8 Maven 3.8.1";
    getInput.mockImplementationOnce(param =>
      param === "annotations-prefix" ? expectedResult : undefined
    );
    // Act
    const result = getAnnotationsPrefix();

    // Assert
    expect(result).toEqual(`[${expectedResult}]`);
  });

  test("undefined", () => {
    // Arrange
    const expectedResult = undefined;
    getInput.mockImplementationOnce(param =>
      param === "annotations-prefix" ? expectedResult : "ANY VALUE"
    );
    // Act
    const result = getAnnotationsPrefix();

    // Assert
    expect(result).toEqual("");
  });
});

describe("getLoggerLevel", () => {
  test("ok", () => {
    // Arrange
    const expectedResult = "debug";
    getInput.mockImplementationOnce(param =>
      param === "logger-level" ? expectedResult : undefined
    );
    // Act
    const result = getLoggerLevel();

    // Assert
    expect(result).toEqual(expectedResult);
  });
  test("exception", () => {
    // Arrange
    const expectedResult = "not-existing-logger-level";
    getInput.mockImplementationOnce(param =>
      param === "logger-level" ? expectedResult : undefined
    );

    // Act & Assert
    try {
      getLoggerLevel();
    } catch (ex) {
      expect(ex.message).toBe(
        "invalid 'logger-level' input: not-existing-logger-level"
      );
    }
  });
});

test("getFlowType", () => {
  // Arrange
  const expectedResult = "pull-request";
  getInput.mockImplementationOnce(param =>
    param === "flow-type" ? expectedResult : undefined
  );
  // Act
  const result = getFlowType();

  // Assert
  expect(result).toEqual(expectedResult);
});

describe("isPullRequestFlowType", () => {
  test("ok", () => {
    // Arrange
    const expectedResult = true;
    getInput.mockImplementationOnce(param =>
      param === "flow-type" ? "pull-request" : undefined
    );
    // Act
    const result = isPullRequestFlowType();

    // Assert
    expect(result).toEqual(expectedResult);
  });

  test("not ok", () => {
    // Arrange
    const expectedResult = false;
    getInput.mockImplementationOnce(param =>
      param === "flow-type" ? "full-downstream" : undefined
    );
    // Act
    const result = isPullRequestFlowType();

    // Assert
    expect(result).toEqual(expectedResult);
  });
});

describe("isFDFlowType", () => {
  test("ok", () => {
    // Arrange
    const expectedResult = true;
    getInput.mockImplementationOnce(param =>
      param === "flow-type" ? "full-downstream" : undefined
    );
    // Act
    const result = isFDFlowType();

    // Assert
    expect(result).toEqual(expectedResult);
  });

  test("not ok", () => {
    // Arrange
    const expectedResult = false;
    getInput.mockImplementationOnce(param =>
      param === "flow-type" ? "pull-request" : undefined
    );
    // Act
    const result = isFDFlowType();

    // Assert
    expect(result).toEqual(expectedResult);
  });
});

describe("isSingleFlowType", () => {
  test("ok", () => {
    // Arrange
    const expectedResult = true;
    getInput.mockImplementationOnce(param =>
      param === "flow-type" ? "single" : undefined
    );
    // Act
    const result = isSingleFlowType();

    // Assert
    expect(result).toEqual(expectedResult);
  });

  test("not ok", () => {
    // Arrange
    const expectedResult = false;
    getInput.mockImplementationOnce(param =>
      param === "flow-type" ? "pull-request" : undefined
    );
    // Act
    const result = isSingleFlowType();

    // Assert
    expect(result).toEqual(expectedResult);
  });
});

describe("eventFlowTypeToCliFlowType", () => {
  const testCases = [
    {
      flowType: "pull-request",
      expected: "pr"
    },
    {
      flowType: "single",
      expected: "single"
    },
    {
      flowType: "full-downstream",
      expected: "fd"
    }
  ];

  testCases.forEach(testCase => {
    test(`type: '${testCase.flowType}' which is: '${testCase.expected}'`, () => {
      const result = eventFlowTypeToCliFlowType(testCase.flowType);
      expect(result).toEqual(testCase.expected);
    });
  });

  test(`type: 'undefined' assertion error expected`, () => {
    try {
      eventFlowTypeToCliFlowType();
    } catch (ex) {
      expect(ex.message).toBe(
        "flow type is not defined for eventFlowTypeToCliFlowType argument"
      );
    }
  });
});
