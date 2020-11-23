const {
  treatCommand
} = require("../../../../src/lib/command/treatment/command-treatment-delegator");
jest.mock("../../../../src/lib/command/treatment/maven-treatment", () => ({
  treat: param => {
    return `${param} [MAVEN]`;
  }
}));

jest.mock("../../../../src/lib/command/treatment/no-treatment", () => ({
  treat: param => {
    return param;
  }
}));

jest.mock(
  "../../../../src/lib/command/treatment/environment-variables-treatment",
  () => ({
    treat: param => {
      return `${param} with treated variables`;
    }
  })
);

test("treatCommand check environment-variables-treatment", () => {
  // Act
  const result = treatCommand("mvn clean install");

  // Assert
  expect(result).toEqual("mvn clean install with treated variables [MAVEN]");
});

test("treatCommand maven", () => {
  // Act
  const result = treatCommand("mvn clean install");

  // Assert
  expect(result).toEqual("mvn clean install with treated variables [MAVEN]");
});

test("treatCommand maven with previous space", () => {
  // Act
  const result = treatCommand(" mvn clean install");

  // Assert
  expect(result).toEqual(" mvn clean install with treated variables [MAVEN]");
});

test("treatCommand maven with envs", () => {
  // Act
  const result = treatCommand("env VAR=1 mvn clean install");

  // Assert
  expect(result).toEqual(
    "env VAR=1 mvn clean install with treated variables [MAVEN]"
  );
});

test("treatCommand maven more complex 1", () => {
  // Act
  const result = treatCommand(
    'mvn -e -nsu -Dfull clean install -Prun-code-coverage -Pwildfly -Dcontainer=wildfly -Dcontainer.profile=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -Dwebdriver.firefox.bin=/opt/tools/firefox-60esr/firefox-bin -DjvmArgs="-Xms1g -Xmx5g"'
  );

  // Assert
  expect(result).toEqual(
    'mvn -e -nsu -Dfull clean install -Prun-code-coverage -Pwildfly -Dcontainer=wildfly -Dcontainer.profile=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -Dwebdriver.firefox.bin=/opt/tools/firefox-60esr/firefox-bin -DjvmArgs="-Xms1g -Xmx5g" with treated variables [MAVEN]'
  );
});

test("treatCommand maven more complex 2", () => {
  // Act
  const result = treatCommand(
    "mvn -e -T1C clean install -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotbugs.skip=true -Drevapi.skip=true"
  );

  // Assert
  expect(result).toEqual(
    "mvn -e -T1C clean install -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotbugs.skip=true -Drevapi.skip=true with treated variables [MAVEN]"
  );
});

test("treatCommand no command", () => {
  // Act
  const result = treatCommand("./shell.sh");

  // Assert
  expect(result).toEqual("./shell.sh with treated variables");
});

test("treatCommand echo ", () => {
  // Act
  const result = treatCommand('echo "command 1"');

  // Assert
  expect(result).toEqual('echo "command 1" with treated variables');
});

test("treatCommand maven with export at the beginning", () => {
  // Act
  const result = treatCommand("export VARIABLE=mvn clean install");

  // Assert
  expect(result).toEqual(
    "export VARIABLE=mvn clean install with treated variables"
  );
});

test("treatCommand maven with echo at the beginning", () => {
  // Act
  const result = treatCommand("echo `mvn clean install`");

  // Assert
  expect(result).toEqual("echo `mvn clean install` with treated variables");
});

test("treatCommand maven with export in the midde", () => {
  // Act
  const result = treatCommand("mvn clean install export VARIABLE=");

  // Assert
  expect(result).toEqual(
    "mvn clean install export VARIABLE= with treated variables [MAVEN]"
  );
});
