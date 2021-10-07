const {
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  eventFlowTypeToCliFlowType
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

test("isPullRequestFlowType ok", () => {
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

test("isPullRequestFlowType not ok", () => {
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

test("isFDFlowType ok", () => {
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

test("isFDFlowType not ok", () => {
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

test("isSingleFlowType ok", () => {
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

test("isSingleFlowType not ok", () => {
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

test("eventFlowTypeToCliFlowType pull-request", () => {
  // Arrange
  const flowType = "pull-request";
  const expected = "pr";
  // Act
  const result = eventFlowTypeToCliFlowType(flowType);

  // Assert
  expect(result).toEqual(expected);
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

  testCases.forEach(test => {
    it(`type: '${test.flowType}' which is: '${test.expected}'`, () => {
      const result = eventFlowTypeToCliFlowType(test.flowType);
      expect(result).toEqual(test.expected);
    });
  });
});
