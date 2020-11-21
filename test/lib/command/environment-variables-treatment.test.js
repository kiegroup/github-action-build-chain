const {
  treat
} = require("../../../src/lib/command/treatment/environment-variables-treatment");
// require("dotenv").config();

test("treat existing variable", () => {
  // Arrange
  process.env.VARIABLE_1 = "VARIABLE_1_VALUE";
  // Act
  const result = treat("command x ${{ env.VARIABLE_1 }}");

  // Assert
  expect(result).toEqual("command x VARIABLE_1_VALUE");
});

test("treat multiples variables variable", () => {
  // Arrange
  process.env.VARIABLE_1 = "VARIABLE_1_VALUE";
  process.env.VARIABLE_2 = "VARIABLE_2_VALUE";
  process.env.VARIABLE_3 = "VARIABLE_3_VALUE";
  process.env.VARIABLE_4 = "VARIABLE_4_VALUE";
  // Act
  const result = treat(
    "command x ${{ env.VARIABLE_1 }} ${{ env.VARIABLE_1 }} ${{ env.VARIABLE_2 }} ${{ env.VARIABLE_3 }} ${{ env.VARIABLE_4 }}"
  );

  // Assert
  expect(result).toEqual(
    "command x VARIABLE_1_VALUE VARIABLE_1_VALUE VARIABLE_2_VALUE VARIABLE_3_VALUE VARIABLE_4_VALUE"
  );
});

test("treat existing variable", () => {
  // Act
  const result = treat("command x ${{ env.VARIABLE_NOT_DEFINED }}");

  // Assert
  expect(result).toEqual("command x undefined");
});
