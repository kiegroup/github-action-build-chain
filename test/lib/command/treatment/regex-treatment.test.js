const {
  treat
} = require("../../../../src/lib/command/treatment/regex-treatment");
jest.mock("../../../../src/lib/common");

test("treat", () => {
  // Act
  const result = treat("mvn clean install", ["(mvn .*)||$1 -s settings.xml"]);

  // Assert
  expect(result).toEqual("mvn clean install -s settings.xml");
});

test("treat two groups", () => {
  // Act
  const result = treat("mvn clean install", ["(mvn)(.*)||$1 -s settings.xml"]);

  // Assert
  expect(result).toEqual("mvn -s settings.xml");
});

test("treat double replacement", () => {
  // Act
  const result = treat("mvn clean install", [
    "(mvn .*)||$1 -s settings.xml",
    "(.*)(settings.xml)||$1filesettings.yml"
  ]);

  // Assert
  expect(result).toEqual("mvn clean install -s filesettings.yml");
});

test("treat real command", () => {
  // Act
  const result = treat(
    "mvn clean install -DskipTests -Dmaven.wagon.httpconnectionManager.ttlSeconds=25 -Dmaven.wagon.http.retryHandler.count=3 -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B",
    ["(^mvn .*)||$1 -s /home/emingora/.m2/settings.xml"]
  );
  // Assert
  expect(result).toEqual(
    "mvn clean install -DskipTests -Dmaven.wagon.httpconnectionManager.ttlSeconds=25 -Dmaven.wagon.http.retryHandler.count=3 -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B -s /home/emingora/.m2/settings.xml"
  );
});

test("treat with / /", () => {
  // Act
  const result = treat("mvn clean install", ["/(mvn .*)/||$1 -s settings.xml"]);

  // Assert
  expect(result).toEqual("mvn clean install -s settings.xml");
});

test("treat with / /i", () => {
  // Act
  const result = treat("mvn clean install", [
    "/(mvn .*)/i||$1 -s settings.xml"
  ]);

  // Assert
  expect(result).toEqual("mvn clean install -s settings.xml");
});
