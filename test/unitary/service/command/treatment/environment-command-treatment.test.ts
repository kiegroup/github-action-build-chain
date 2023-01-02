import { EnvironmentCommandTreatment } from "@bc/service/command/treatment/environment-command-treatment";

describe("EnvironmentCommandTreatment", () => {
  test.each([
    ["Existing variable", "command x ${{ env.VARIABLE_1 }}", (): void => {
      process.env.VARIABLE_1 = "VARIABLE_1_VALUE";
    }, "command x VARIABLE_1_VALUE"],
    ["treat multiples variables variable", "command x ${{ env.VARIABLE_1 }} ${{ env.VARIABLE_1 }} ${{ env.VARIABLE_2 }} ${{ env.VARIABLE_3 }} ${{ env.VARIABLE_4 }}", (): void => {
      process.env.VARIABLE_1 = "VARIABLE_1_VALUE";
      process.env.VARIABLE_2 = "VARIABLE_2_VALUE";
      process.env.VARIABLE_3 = "VARIABLE_3_VALUE";
      process.env.VARIABLE_4 = "VARIABLE_4_VALUE";
    }, "command x VARIABLE_1_VALUE VARIABLE_1_VALUE VARIABLE_2_VALUE VARIABLE_3_VALUE VARIABLE_4_VALUE"],
    ["treat not existing variable", "command x ${{ env.VARIABLE_NOT_DEFINED }}", (): void => {
      process.env.VARIABLE_1 = "VARIABLE_1_VALUE";
    }, "command x "],
    ["no env variables on the command", "command x", (): void => {
      process.env.VARIABLE_1 = "VARIABLE_1_VALUE";
    }, "command x"],
    ["export command", "export VARIABLE_NAME=value", (): void => {
      process.env.VARIABLE_NAME = "VARIABLE_VALUE";
    }, "export VARIABLE_NAME=value"],
  ])("%p", (title: string, command: string, arrangeEnvVariables: () => void, expected: string) => {
    // Arrange
    arrangeEnvVariables();

    // Act
    const result = new EnvironmentCommandTreatment().treat(command, {});

    // Assert
    expect(result).toBe(expected);
  });
});