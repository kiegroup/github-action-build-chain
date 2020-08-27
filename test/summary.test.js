const { printCheckoutInformation } = require("../src/lib/summary");
const { logger } = require("../src/lib/common");
jest.mock("../src/lib/common");

afterEach(() => {
  jest.clearAllMocks();
});

test("printCheckoutInformation", async () => {
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
    "groupx/projectx:branchx. It has Been merged with targetGroupx/projectx:targetBranchx"
  );
  expect(logger.info).toHaveBeenCalledWith(
    "groupy/projecty:branchx. It has Been merged with targetGroupy/projecty:targetBranchy"
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

test("printCheckoutInformation empty", async () => {
  // Arrange
  const checkoutInfo = {};

  // Act
  printCheckoutInformation(checkoutInfo);

  // // Assert
  expect(logger.info).toHaveBeenCalledTimes(0);
});

test("printCheckoutInformation undefined", async () => {
  // Arrange
  const checkoutInfo = undefined;

  // Act
  printCheckoutInformation(checkoutInfo);

  // // Assert
  expect(logger.info).toHaveBeenCalledTimes(0);
});
