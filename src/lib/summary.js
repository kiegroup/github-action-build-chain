const { logger } = require("./common");

const groupBy = (checkoutInfo, key) => {
  return Object.values(checkoutInfo).reduce((acc, checkInfo) => {
    if (checkInfo) {
      (acc[checkInfo[key]] = acc[checkInfo[key]] || []).push(checkInfo);
    }
    return acc;
  }, {});
};

function printCheckoutInformation(checkoutInfo) {
  if (checkoutInfo && Object.keys(checkoutInfo).length) {
    logger.info("----------------------------------------------");
    Object.entries(checkoutInfo).forEach(([project, checkInfo]) =>
      logger.info(
        checkInfo
          ? `${checkInfo.group}/${checkInfo.project}:${checkInfo.branch}.${
              checkInfo.merge
                ? ` It has Been merged with ${checkInfo.targetGroup}/${checkInfo.project}:${checkInfo.targetBranch}`
                : ""
            }`
          : `${project}: No checkout information`
      )
    );
    logger.info("----------------------------------------------");
    Object.entries(groupBy(checkoutInfo, "branch")).forEach(
      ([branch, checkoutInfoList]) => {
        logger.info(
          `Projects taken from branch "${branch}":${checkoutInfoList.map(
            checkInfo => `
  ${checkInfo.group}/${checkInfo.project}${
              checkInfo.merge
                ? `. Merged with ${checkInfo.targetGroup}/${checkInfo.project}:${checkInfo.targetBranch}`
                : ""
            }`
          )}`
        );
      }
    );
    logger.info("----------------------------------------------");
  }
}

module.exports = {
  printCheckoutInformation
};
