const {
  getMatrixVariables,
  getDefinitionFile
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

test("getMatrixVariables", () => {
  // Arrange
  const expectedResult = {
    "matrix.key1": "${{ matrix.value1 }}",
    "matrix.key2": "${{ matrix.value2 }}",
    "matrix.key3": "${{ matrix.value3 }}"
  };
  getInput.mockImplementationOnce(param =>
    param === "matrix-variables"
      ? "matrix.key1:${{ matrix.value1 }}, matrix.key2:${{ matrix.value2 }},matrix.key3: ${{ matrix.value3 }}"
      : undefined
  );
  // Act
  const result = getMatrixVariables();
  // Assert
  expect(result).toEqual(expectedResult);
});
