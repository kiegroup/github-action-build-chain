import { CommandBuilder } from "@bc/service/command/treatment/command-builder";
import { EnvironmentCommandTreatment } from "@bc/service/command/treatment/environment-command-treatment";

describe("CommandBuilder", () => {
  test("single treat", () => {
    // Arrange
    const environmentCommandTreatment = new EnvironmentCommandTreatment();
    const options = {};
    jest.spyOn(environmentCommandTreatment, "treat").mockReturnValueOnce("treated1");

    // Act
    const result = new CommandBuilder("commandx", options).treat(environmentCommandTreatment).build();

    // Assert
    expect(result).toBe("treated1");
    expect(environmentCommandTreatment.treat).toHaveBeenCalledTimes(1);
    expect(environmentCommandTreatment.treat).toHaveBeenCalledWith("commandx", options);
  });

  test("multiple treat", () => {
    // Arrange
    const environmentCommandTreatment = new EnvironmentCommandTreatment();
    const options = { replaceExpressions: ["1", "2"] };
    jest.spyOn(environmentCommandTreatment, "treat").mockReturnValueOnce("treated1").mockReturnValueOnce("treated2").mockReturnValueOnce("treated3");

    // Act
    const result = new CommandBuilder("commandx", options).treat(environmentCommandTreatment).treat(environmentCommandTreatment).treat(environmentCommandTreatment).build();

    // Assert
    expect(result).toBe("treated3");
    expect(environmentCommandTreatment.treat).toHaveBeenCalledTimes(3);
    expect(environmentCommandTreatment.treat).toHaveBeenCalledWith("commandx", options);
    expect(environmentCommandTreatment.treat).toHaveBeenCalledWith("treated1", options);
    expect(environmentCommandTreatment.treat).toHaveBeenCalledWith("treated2", options);
  });
});