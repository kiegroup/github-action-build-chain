const {
  treatCommand
} = require("../../src/lib/command/command-treatment-delegator");
jest.mock("../../src/lib/command/maven-treatment", () => ({
  treat: () => {
    return "maven command";
  }
}));

jest.mock("../../src/lib/command/no-treatment", () => ({
  treat: () => {
    return "same command";
  }
}));

test("treatCommand maven", () => {
  // Act
  const result = treatCommand("mvn clean install");

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand maven with previous space", () => {
  // Act
  const result = treatCommand(" mvn clean install");

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand maven with envs", () => {
  // Act
  const result = treatCommand("env VAR=1 mvn clean install");

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand maven more complex 1", () => {
  // Act
  const result = treatCommand(
    'mvn -e -nsu -Dfull clean install -Prun-code-coverage -Pwildfly -Dcontainer=wildfly -Dcontainer.profile=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -Dwebdriver.firefox.bin=/opt/tools/firefox-60esr/firefox-bin -DjvmArgs="-Xms1g -Xmx5g"'
  );

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand maven more complex 2", () => {
  // Act
  const result = treatCommand(
    "mvn -e -T1C clean install -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotbugs.skip=true -Drevapi.skip=true"
  );

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand no command", () => {
  // Act
  const result = treatCommand("./shell.sh");

  // Assert
  expect(result).toEqual("same command");
});
