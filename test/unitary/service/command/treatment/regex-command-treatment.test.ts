import { TreatmentOptions } from "@bc/domain/treatment-options";
import { RegexCommandTreatment } from "@bc/service/command/treatment/regex-command-treatment";
import { Container } from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { TestLoggerService } from "@bc/service/logger/__mocks__/test-logger-service";

jest.mock("@bc/service/logger/logger-service-factory");

describe("RegexCommandTreatment", () => {
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

  test.each([
    ["ok", "mvn clean install", { replaceExpressions: ["(mvn .*)||$1 -s settings.xml"] }, "mvn clean install -s settings.xml", 2],
    ["ok. Two regex groups", "mvn clean install", { replaceExpressions: ["(mvn)(.*)||$1 -s settings.xml"] }, "mvn -s settings.xml", 2],
    ["ok. Multiple replacements", "mvn clean install", { replaceExpressions: ["(mvn .*)||$1 -s settings.xml", "(.*)(settings.xml)||$1filesettings.yml"] }, "mvn clean install -s filesettings.yml", 2],
    ["ok. Real Command", "mvn clean install -DskipTests -Dmaven.wagon.httpconnectionManager.ttlSeconds=25 -Dmaven.wagon.http.retryHandler.count=3 -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B", { replaceExpressions: ["(^mvn .*)||$1 -s /home/emingora/.m2/settings.xml"] }, "mvn clean install -DskipTests -Dmaven.wagon.httpconnectionManager.ttlSeconds=25 -Dmaven.wagon.http.retryHandler.count=3 -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B -s /home/emingora/.m2/settings.xml", 2],
    ["ok. Regex with / /", "mvn clean install", { replaceExpressions: ["/(mvn .*)/||$1 -s settings.xml"] }, "mvn clean install -s settings.xml", 2],
    ["ok. Regex with / /i", "mvn clean install", { replaceExpressions: ["/(mvn .*)/i||$1 -s settings.xml"] }, "mvn clean install -s settings.xml", 2],
    ["No replacement. Regex not matching", "maven clean install", { replaceExpressions: ["/(mvn .*)/i||$1 -s settings.xml"] }, "maven clean install", 2],
    ["No replacement. No replacement expression", "mvn clean install", {}, "mvn clean install", 0],
  ])("%p", (title: string, command: string, options: TreatmentOptions, expected: string, times: number) => {
    // Act
    const result = new RegexCommandTreatment().treat(command, options);

    // Assert
    expect(result).toBe(expected);
    expect(TestLoggerService.prototype.info).toHaveBeenCalledTimes(times);
  });
});