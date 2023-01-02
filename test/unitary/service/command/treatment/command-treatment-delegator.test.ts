import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { EnvironmentCommandTreatment } from "@bc/service/command/treatment/environment-command-treatment";
import { MavenCommandTreatment } from "@bc/service/command/treatment/maven-command-treatment";
import { RegexCommandTreatment } from "@bc/service/command/treatment/regex-command-treatment";
import { CommandBuilder } from "@bc/service/command/treatment/command-builder";

jest.mock("@bc/service/command/treatment/environment-command-treatment");
jest.mock("@bc/service/command/treatment/maven-command-treatment");
jest.mock("@bc/service/command/treatment/regex-command-treatment");
jest.mock("@bc/service/command/treatment/command-builder");

describe("CommandTreatmentDelegator", () => {
  test("treatCommand", () => {
    // Arrange
    const environmentCommandTreatment = new EnvironmentCommandTreatment();
    const mavenCommandTreatment = new MavenCommandTreatment();
    const regexCommandTreatment = new RegexCommandTreatment();

    (CommandBuilder.prototype.treat as jest.Mocked<jest.Mock>).mockReturnValue(CommandBuilder.prototype);
    (CommandBuilder.prototype.build as jest.Mocked<jest.Mock>).mockReturnValue("treated");

    // Act
    const result = new CommandTreatmentDelegator(environmentCommandTreatment, mavenCommandTreatment, regexCommandTreatment).treatCommand("commandx", {});

    // Assert
    expect(CommandBuilder.prototype.treat).toHaveBeenCalledTimes(3);
    expect(CommandBuilder.prototype.treat).toHaveBeenCalledWith(environmentCommandTreatment);
    expect(CommandBuilder.prototype.treat).toHaveBeenCalledWith(mavenCommandTreatment);
    expect(CommandBuilder.prototype.treat).toHaveBeenCalledWith(regexCommandTreatment);
    expect(result).toBe("treated");
  });
});