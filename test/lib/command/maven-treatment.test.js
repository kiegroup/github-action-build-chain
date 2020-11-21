const { treat } = require("../../../src/lib/command/treatment/maven-treatment");

test("treat", () => {
  // Act
  const result = treat("mvn clean install");

  // Assert
  expect(result).toEqual(
    "mvn clean install -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B"
  );
});
