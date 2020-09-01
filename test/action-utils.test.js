const { getWorkflowfileName } = require("../src/lib/action-utils");

const { getInput } = require("@actions/core");
jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

test("getWorkflowfileName", () => {
  // Arrange
  const expectedResult = "pull_request.yml";
  getInput.mockImplementationOnce(param =>
    param === "workflow-file-name" ? expectedResult : undefined
  );
  // Act
  const result = getWorkflowfileName();

  // Assert
  expect(result).toEqual(expectedResult);
});
