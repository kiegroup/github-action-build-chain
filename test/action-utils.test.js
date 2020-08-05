const {
  getChildDependencies,
  getParentDependencies,
  getBuildCommand,
  getWorkflowfileName
} = require("../src/lib/action-utils");
jest.mock("@actions/core", () => ({
  getInput: param => {
    return param === "parent-dependencies"
      ? "lienzo-core, lienzo-test,drools"
      : param === "child-dependencies"
      ? "appformer"
      : param.includes("build-command")
      ? "command 1 x | command 2"
      : param.includes("workflow-file-name")
      ? "pull_request.yml"
      : undefined;
  }
}));

test("getParentDependencies", () => {
  // Act
  const result = getParentDependencies();

  // Assert
  expect(result).toEqual({ "lienzo-core": {}, "lienzo-test": {}, drools: {} });
});

test("getChildDependencies", () => {
  // Act
  const result = getChildDependencies();

  // Assert
  expect(result).toEqual({ appformer: {} });
});

test("getBuildCommand", () => {
  // Act
  const result = getBuildCommand();

  // Assert
  expect(result).toEqual(["command 1 x", "command 2"]);
});

test("getWorkflowfileName", () => {
  // Act
  const result = getWorkflowfileName();

  // Assert
  expect(result).toEqual("pull_request.yml");
});
