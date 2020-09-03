const { getYamlFileContent } = require("../src/lib/fs-helper");
const path = require("path");

test("readYamlFile", () => {
  // Arrange
  // Act
  const flowData = getYamlFileContent(
    path.join(".", "test", "resources", "flow.yaml")
  );
  // Assert
  const expected = {
    on: ["pull_request"],
    jobs: {
      "build-chain": {
        "runs-on": "ubuntu-latest",
        name: "Build Chain Flow",
        steps: [
          {
            uses: "actions/checkout@v2"
          },
          {
            env: {
              GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
            },
            id: "build-chain",
            name: "Build Chain",
            uses: "kiegroup/github-action-build-chain@master",
            with: {
              "build-command": `mvn clean
mvn -e -nsu -Dfull clean install -Prun-code-coverage -Dcontainer.profile=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -DjvmArgs="-Xms1g -Xmx4g -XX:+CMSClassUnloadingEnabled"
`,
              "build-command-downstream": `mvn clean
mvn -e -nsu -fae -T1C clean install -Dfull -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -DjvmArgs=-Xmx4g
`,
              "build-command-upstream": `mvn clean
mvn -e -T1C clean install -DskipTests -Dgwt.compiler.skip=true -Dgwt.skipCompilation=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotbugs.skip=true -Drevapi.skip=true
`,
              "child-dependencies": `appformer@7.x:master
lienzo-tests
`,
              "parent-dependencies": `lienzo-core
groupx/errai
`,
              "workflow-file-name": "flow.yaml"
            }
          }
        ]
      }
    }
  };
  expect(flowData).toEqual(expected);
});
