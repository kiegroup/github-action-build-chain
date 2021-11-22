const {
  printCheckoutInformation,
  printExecutionPlan,
  printExecutionSummary
} = require("../src/lib/summary");
const { logger } = require("../src/lib/common");
jest.mock("../src/lib/common");

afterEach(() => {
  jest.clearAllMocks();
});

describe("printCheckoutInformation", () => {
  test("ok", async () => {
    // Arrange
    const checkoutInfo = {
      "droolsjbpm-integration": {
        project: "projectx",
        group: "groupx",
        branch: "branchx",
        targetGroup: "targetGroupx",
        targetBranch: "targetBranchx",
        merge: true
      },
      "lienzo-tests": {
        project: "projecty",
        group: "groupy",
        branch: "branchx",
        targetGroup: "targetGroupy",
        targetBranch: "targetBranchy",
        merge: true
      },
      "lienzo-core": {
        project: "projectz",
        group: "groupz",
        branch: "branchz",
        targetGroup: "targetGroupz",
        targetBranch: "targetBranchz",
        merge: false
      }
    };

    // Act
    printCheckoutInformation(checkoutInfo);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(8);
    expect(logger.info).toHaveBeenCalledWith(
      "groupx/projectx:branchx. It has been merged with targetGroupx/projectx:targetBranchx"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "groupy/projecty:branchx. It has been merged with targetGroupy/projecty:targetBranchy"
    );
    expect(logger.info).toHaveBeenCalledWith("groupz/projectz:branchz.");
    expect(logger.info)
      .toHaveBeenCalledWith(`Projects taken from branch "branchx":
  groupx/projectx. Merged with targetGroupx/projectx:targetBranchx,
  groupy/projecty. Merged with targetGroupy/projecty:targetBranchy`);
    expect(logger.info)
      .toHaveBeenCalledWith(`Projects taken from branch "branchz":
  groupz/projectz`);
  });

  test("some undefined", async () => {
    // Arrange
    const checkoutInfo = {
      "kiegroup/droolsjbpm-integration": undefined,
      "kiegroup/lienzo-tests": {
        project: "lienzo-tests",
        group: "kiegroup",
        branch: "branchx",
        targetGroup: "targetGroupy",
        targetBranch: "targetBranchy",
        merge: true
      },
      "kiegroup/lienzo-core": {
        project: "lienzo-core",
        group: "kiegroup",
        branch: "branchz",
        targetGroup: "targetGroupz",
        targetBranch: "targetBranchz",
        merge: false
      }
    };

    // Act
    printCheckoutInformation(checkoutInfo);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(8);
    expect(logger.info).toHaveBeenCalledWith(
      "kiegroup/droolsjbpm-integration: No checkout information"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "kiegroup/lienzo-tests:branchx. It has been merged with targetGroupy/lienzo-tests:targetBranchy"
    );
    expect(logger.info).toHaveBeenCalledWith("kiegroup/lienzo-core:branchz.");
    expect(logger.info)
      .toHaveBeenCalledWith(`Projects taken from branch "branchz":
  kiegroup/lienzo-core`);
  });

  test("empty", async () => {
    // Arrange
    const checkoutInfo = {};

    // Act
    printCheckoutInformation(checkoutInfo);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(0);
  });

  test("undefined", async () => {
    // Arrange
    const checkoutInfo = undefined;

    // Act
    printCheckoutInformation(checkoutInfo);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(0);
  });
});

describe("printExecutionPlan", () => {
  test("projecty triggering the job", async () => {
    // Arrange
    const projectTriggeringJob = "projecty";
    const nodeChain = [
      {
        project: "projectx",
        build: {
          "build-command": {
            before: {
              current: "projectx before current command",
              upstream: "projectx before upstream command",
              downstream: "projectx before downstream command"
            },
            current: "projectx current current command",
            upstream: "projectx current upstream command",
            downstream: "projectx current downstream command",
            after: {
              current: "projectx after current command",
              upstream: "projectx after upstream command",
              downstream: "projectx after downstream command"
            }
          },
          skip: undefined
        }
      },
      {
        project: "projecty",
        build: {
          "build-command": {
            before: {
              current: "projecty before current command",
              upstream: "projecty before upstream command",
              downstream: "projecty before downstream command"
            },
            current: "projecty current current command",
            upstream: "projecty current upstream command",
            downstream: "projecty current downstream command",
            after: {
              current: "projecty after current command",
              upstream: "projecty after upstream command",
              downstream: "projecty after downstream command"
            }
          },
          skip: undefined
        }
      }
    ];

    // Act
    printExecutionPlan(nodeChain, projectTriggeringJob);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(13);
    expect(logger.info).toHaveBeenCalledWith("[2] projects will be executed");
    expect(logger.info).toHaveBeenCalledWith("[projectx]");
    expect(logger.info).toHaveBeenCalledWith("[projecty]");
    expect(logger.info).toHaveBeenCalledWith("Level Type: [upstream].");
    expect(logger.info).toHaveBeenCalledWith("Level Type: [current].");
    expect(logger.info).toHaveBeenCalledWith(
      "projectx before upstream command"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "projectx current upstream command"
    );
    expect(logger.info).toHaveBeenCalledWith("projectx after upstream command");
    expect(logger.info).toHaveBeenCalledWith("projecty before current command");
    expect(logger.info).toHaveBeenCalledWith(
      "projecty current current command"
    );
    expect(logger.info).toHaveBeenCalledWith("projecty after current command");
  });

  test("skip all", async () => {
    // Arrange
    const projectTriggeringJob = "projecty";
    const nodeChain = [
      {
        project: "projectx",
        build: {
          "build-command": {
            before: {
              current: "projectx before current command",
              upstream: "projectx before upstream command",
              downstream: "projectx before downstream command"
            },
            current: "projectx current current command",
            upstream: "projectx current upstream command",
            downstream: "projectx current downstream command",
            after: {
              current: "projectx after current command",
              upstream: "projectx after upstream command",
              downstream: "projectx after downstream command"
            }
          },
          skip: true
        }
      },
      {
        project: "projecty",
        build: {
          "build-command": {
            before: {
              current: "projecty before current command",
              upstream: "projecty before upstream command",
              downstream: "projecty before downstream command"
            },
            current: "projecty current current command",
            upstream: "projecty current upstream command",
            downstream: "projecty current downstream command",
            after: {
              current: "projecty after current command",
              upstream: "projecty after upstream command",
              downstream: "projecty after downstream command"
            }
          },
          skip: true
        }
      }
    ];

    // Act
    printExecutionPlan(nodeChain, projectTriggeringJob);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(9);
    expect(logger.info).toHaveBeenCalledWith("[2] projects will be executed");
    expect(logger.info).toHaveBeenCalledWith("[projectx]");
    expect(logger.info).toHaveBeenCalledWith("[projecty]");
    expect(logger.info).toHaveBeenCalledWith("Level Type: [upstream].");
    expect(logger.info).toHaveBeenCalledWith("Level Type: [current].");
    expect(logger.info).toHaveBeenCalledWith(
      "No command will be executed (the project is skipped)."
    );
  });

  test("projectx triggering the job", async () => {
    // Arrange
    const projectTriggeringJob = "projectx";
    const nodeChain = [
      {
        project: "projectx",
        build: {
          "build-command": {
            before: {
              current: "projectx before current command",
              upstream: "projectx before upstream command",
              downstream: "projectx before downstream command"
            },
            current: "projectx current current command",
            upstream: "projectx current upstream command",
            downstream: "projectx current downstream command",
            after: {
              current: "projectx after current command",
              upstream: "projectx after upstream command",
              downstream: "projectx after downstream command"
            }
          },
          skip: undefined
        }
      },
      {
        project: "projecty",
        build: {
          "build-command": {
            before: {
              current: "projecty before current command",
              upstream: "projecty before upstream command",
              downstream: "projecty before downstream command"
            },
            current: "projecty current current command",
            upstream: "projecty current upstream command",
            downstream: "projecty current downstream command",
            after: {
              current: "projecty after current command",
              upstream: "projecty after upstream command",
              downstream: "projecty after downstream command"
            }
          },
          skip: undefined
        }
      }
    ];

    // Act
    printExecutionPlan(nodeChain, projectTriggeringJob);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(13);
    expect(logger.info).toHaveBeenCalledWith("[2] projects will be executed");
    expect(logger.info).toHaveBeenCalledWith("[projectx]");
    expect(logger.info).toHaveBeenCalledWith("[projecty]");
    expect(logger.info).toHaveBeenCalledWith("Level Type: [current].");
    expect(logger.info).toHaveBeenCalledWith("Level Type: [downstream].");
    expect(logger.info).toHaveBeenCalledWith("projectx before current command");
    expect(logger.info).toHaveBeenCalledWith(
      "projectx current current command"
    );
    expect(logger.info).toHaveBeenCalledWith("projectx after current command");
    expect(logger.info).toHaveBeenCalledWith(
      "projecty before downstream command"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "projecty current downstream command"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "projecty after downstream command"
    );
  });
});

describe("printExecutionSummary", () => {
  test("happy path", async () => {
    // Arrange
    const executionResult = [
      { project: "kiegroup/projectX", result: "ok", time: 100 },
      { project: "kiegroup/projectY", result: "ok", time: 100 },
      { project: "kiegroup/projectZ", result: "ok", time: 100 }
    ];

    // Act
    printExecutionSummary(executionResult);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectX]. Execution Result: ok. Time: 100ms"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectY]. Execution Result: ok. Time: 100ms"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectZ]. Execution Result: ok. Time: 100ms"
    );
  });

  test("different times", async () => {
    // Arrange
    const executionResult = [
      { project: "kiegroup/projectX", result: "ok", time: 100 },
      { project: "kiegroup/projectY", result: "ok", time: 1000 },
      { project: "kiegroup/projectZ", result: "ok", time: 1000000 }
    ];

    // Act
    printExecutionSummary(executionResult);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectX]. Execution Result: ok. Time: 100ms"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectY]. Execution Result: ok. Time: 1s"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectZ]. Execution Result: ok. Time: 16m 40s"
    );
  });

  test("different results", async () => {
    // Arrange
    const executionResult = [
      { project: "kiegroup/projectX", result: "ok", time: 100 },
      { project: "kiegroup/projectY", result: "ok", time: 1000 },
      { project: "kiegroup/projectZ", result: "not ok", time: 1000000 }
    ];

    // Act
    printExecutionSummary(executionResult);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectX]. Execution Result: ok. Time: 100ms"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectY]. Execution Result: ok. Time: 1s"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectZ]. Execution Result: not ok. Time: 16m 40s"
    );
  });

  test("time not defined", async () => {
    // Arrange
    const executionResult = [
      { project: "kiegroup/projectX", result: "ok", time: 100 },
      { project: "kiegroup/projectY", result: "ok" },
      { project: "kiegroup/projectZ", result: "ok", time: 1000000 },
      { project: "kiegroup/projectZA", result: "ok", time: 1 }
    ];

    // Act
    printExecutionSummary(executionResult);

    // // Assert
    expect(logger.info).toHaveBeenCalledTimes(6);
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectX]. Execution Result: ok. Time: 100ms"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectY]. Execution Result: ok. Time: not defined"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectZ]. Execution Result: ok. Time: 16m 40s"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[kiegroup/projectZA]. Execution Result: ok. Time: 1ms"
    );
  });
});
