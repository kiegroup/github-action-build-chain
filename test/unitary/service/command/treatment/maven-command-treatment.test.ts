import { MavenCommandTreatment } from "@bc/service/command/treatment/maven-command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";

describe("MavenCommandTreatment", () => {
  test.each([
    ["maven simple command", "mvn install", {}, "mvn install -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B"],
    ["maven simple command. Not specifying Maven binary", "maven install", {}, "maven install"],
    ["maven simple command. Different Maven binary", "maven install", { mavenBinary: "maven" }, "maven install -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B"],
    ["no maven command", "npm test", {}, "npm test"],
    ["maven command from path", "/home/software/maven/bin/mvn clean", {}, "/home/software/maven/bin/mvn clean -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B"],
  ])("%p", (title: string, command: string, options: TreatmentOptions, expected: string) => {
    // Act
    const result = new MavenCommandTreatment().treat(command, options);

    // Assert
    expect(result).toBe(expected);
  });
});