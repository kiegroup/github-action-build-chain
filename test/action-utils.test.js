const {
  getChildDependencies,
  getParentDependencies,
  getBuildCommand,
  getBuildCommandDownstream,
  getBuildCommandUpstream,
  getWorkflowfileName,
  getMatrixVariables
} = require("../src/lib/action-utils");

const { getInput } = require("@actions/core");
jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

test("getParentDependencies", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "parent-dependencies" ? "lienzo-core" : undefined
  );
  // Act
  const result = getParentDependencies();
  // Assert
  expect(result).toEqual({ "lienzo-core": {} });
});

test("getParentDependencies with group", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "parent-dependencies" ? "kiegroup/lienzo-core" : undefined
  );
  // Act
  const result = getParentDependencies();
  // Assert
  expect(result).toEqual({ "lienzo-core": { group: "kiegroup" } });
});

test("getParentDependencies multiple", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "parent-dependencies"
      ? `lienzo-core
lienzo-test
drools`
      : undefined
  );
  // Act
  const result = getParentDependencies();
  // Assert
  expect(result).toEqual({ "lienzo-core": {}, "lienzo-test": {}, drools: {} });
});

test("getChildDependencies", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "child-dependencies" ? "appformer" : undefined
  );
  // Act
  const result = getChildDependencies();
  // Assert
  expect(result).toEqual({ appformer: {} });
});

test("getChildDependencies multiple", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "child-dependencies"
      ? `appformer
 groupx/projectx`
      : undefined
  );
  // Act
  const result = getChildDependencies();
  // Assert
  expect(result).toEqual({ appformer: {}, projectx: { group: "groupx" } });
});

test("getBuildCommand", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "build-command" ? "command 1 x" : undefined
  );
  // Act
  const result = getBuildCommand();
  // Assert
  expect(result).toEqual(["command 1 x"]);
});

test("getBuildCommand multiple", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "build-command" ? "command 1 x | command 2" : undefined
  );
  // Act
  const result = getBuildCommand();
  // Assert
  expect(result).toEqual(["command 1 x", "command 2"]);
});

test("getBuildCommandDownstream", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "build-command-downstream" ? "command 1 x" : undefined
  );
  // Act
  const result = getBuildCommandDownstream();
  // Assert
  expect(result).toEqual(["command 1 x"]);
});

test("getBuildCommandDownstream multiple", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "build-command-downstream" ? "command 1 x | command 2" : undefined
  );
  // Act
  const result = getBuildCommandDownstream();
  // Assert
  expect(result).toEqual(["command 1 x", "command 2"]);
});

test("getBuildCommandUpstream", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "build-command-upstream" ? "command 1 x" : undefined
  );
  // Act
  const result = getBuildCommandUpstream();
  // Assert
  expect(result).toEqual(["command 1 x"]);
});

test("getBuildCommandUpstream multiple", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "build-command-upstream" ? "command 1 x | command 2" : undefined
  );
  // Act
  const result = getBuildCommandUpstream();
  // Assert
  expect(result).toEqual(["command 1 x", "command 2"]);
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

test("getMatrixVariables", () => {
  // Arrange
  getInput.mockImplementationOnce(param =>
    param === "matrix-variables"
      ? "matrix.key1:${{ matrix.value1 }}, matrix.key2:${{ matrix.value2 }},matrix.key3: ${{ matrix.value3 }}"
      : undefined
  );
  const expectedResult = {
    "matrix.key1": "${{ matrix.value1 }}",
    "matrix.key2": "${{ matrix.value2 }}",
    "matrix.key3": "${{ matrix.value3 }}"
  };
  // Act
  const result = getMatrixVariables();
  // Assert
  expect(result).toEqual(expectedResult);
});
