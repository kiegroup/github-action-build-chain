const { readWorkflowInformation } = require("../src/lib/build-chain-flow-helper");

test("parseWorkflowInformation", () => {
  // Act
  const buildChainInformation = readWorkflowInformation('flow.yaml', 'test/resources');
  // Assert
  const expected = {
    'id': 'build-chain',
    'name': 'Build Chain',
    'buildCommand': "mvn -e -nsu -Dfull clean install -Prun-code-coverage -Dcontainer.profile=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -DjvmArgs=\"-Xms1g -Xmx4g -XX:+CMSClassUnloadingEnabled\"",
    'buildCommandUpstream': "mvn -e -T1C clean install -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotbugs.skip=true -Drevapi.skip=true",
    'buildCommandDownstream': "mvn -e -nsu -fae -T1C clean install -Dfull -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -DjvmArgs=-Xmx4g",
    'childDependencies': ['appformer', 'lienzo-tests'],
    'parentDependencies': ['lienzo-core']

  };
  expect(expected).toEqual(buildChainInformation);
});
