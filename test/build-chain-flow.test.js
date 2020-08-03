const { treatParents } = require("../src/lib/build-chain-flow");
const {
  checkoutDependencies,
  getDir,
  readWorkflowInformation
} = require("../src/lib/build-chain-flow-helper");
jest.mock("../src/lib/build-chain-flow-helper");

test("treatParents", async () => {
  // Arrange
  const context = { config: { github: { workflow: "main.yaml" } } };
  const workflowInformation = {
    id: "build-chain",
    name: "Build Chain",
    config: {
      github: {
        workflow: "main.yaml"
      }
    },
    buildCommands: ["command 1", "command 2"],
    buildCommandsUpstream: ["upstream 1", "upstream 2"],
    buildCommandsDownstream: ["downstream 1", "downstream 2"],
    childDependencies: {
      projectB: { mapping: { source: "7.x", target: "master" } },
      projectC: {}
    },
    parentDependencies: { projectD: {} }
  };
  // Act
  await treatParents(context, [], "projectA", workflowInformation);
  // Assert
  expect(checkoutDependencies).toHaveBeenCalledWith(context, { projectD: {} });
  expect(getDir).toHaveBeenCalledWith("projectD");
  expect(readWorkflowInformation).toHaveBeenCalledWith("main.yaml", undefined);
});
