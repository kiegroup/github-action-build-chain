import { CommandBuilder } from "@bc/service/command/treatment/command-builder";
import { EnvironmentCommandTreatment } from "@bc/service/command/treatment/environment-command-treatment";

jest.mock("@bc/service/command/treatment/environment-command-treatment");
const EnvironmentCommandTreatmentMock = <jest.Mock<EnvironmentCommandTreatment>>EnvironmentCommandTreatment;

describe("CommandBuilder", () => {
  test("append", () => {
    // Arrange
    const environmentCommandTreatmentMock = new EnvironmentCommandTreatmentMock();

    // Act
    const result = new CommandBuilder("commandx", {}).treat(environmentCommandTreatmentMock).build();

    // Assert
    expect(environmentCommandTreatmentMock.treat).toHaveBeenCalledTimes(1);
    expect(result).toBe("commandx treated");
  });
});