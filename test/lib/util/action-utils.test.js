const {
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  isPullRequestFlowType,
  isBranchFlowType
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
    param === "flow-type" ? "branch" : undefined
  );
  // Act
  const result = isPullRequestFlowType();

  // Assert
  expect(result).toEqual(expectedResult);
});

test("isPullRequestFlowType ok", () => {
  // Arrange
  const expectedResult = true;
  getInput.mockImplementationOnce(param =>
    param === "flow-type" ? "branch" : undefined
  );
  // Act
  const result = isBranchFlowType();

  // Assert
  expect(result).toEqual(expectedResult);
});

test("isPullRequestFlowType not ok", () => {
  // Arrange
  const expectedResult = false;
  getInput.mockImplementationOnce(param =>
    param === "flow-type" ? "pull-request" : undefined
  );
  // Act
  const result = isBranchFlowType();

  // Assert
  expect(result).toEqual(expectedResult);
});
