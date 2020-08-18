const {
  getChildDependencies,
  getParentDependencies,
  getBuildCommand,
  getWorkflowfileName,
  getMatrixVariables
} = require("../src/lib/action-utils");
jest.mock("@actions/core", () => ({
  getInput: param => {
    return param === "parent-dependencies"
      ? "lienzo-core, lienzo-test,drools"
      : param === "child-dependencies"
      ? "appformer"
      : param.includes("build-command")
      ? "command 1 x | command 2"
      : param.includes("workflow-file-name")
      ? "pull_request.yml"
      : param.includes("matrix-variables")
      ? "matrix.key1:${{ matrix.value1 }}, matrix.key2:${{ matrix.value2 }},matrix.key3: ${{ matrix.value3 }}"
      : undefined;
  }
}));

test("getParentDependencies", () => {
  // Act
  const result = getParentDependencies();

  // Assert
  expect(result).toEqual({ "lienzo-core": {}, "lienzo-test": {}, drools: {} });
});

test("getChildDependencies", () => {
  // Act
  const result = getChildDependencies();

  // Assert
  expect(result).toEqual({ appformer: {} });
});

test("getBuildCommand", () => {
  // Act
  const result = getBuildCommand();

  // Assert
  expect(result).toEqual(["command 1 x", "command 2"]);
});

test("getWorkflowfileName", () => {
  // Act
  const result = getWorkflowfileName();

  // Assert
  expect(result).toEqual("pull_request.yml");
});

test("getMatrixVariables", () => {
  // Arrange
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
