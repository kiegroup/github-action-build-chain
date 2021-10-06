const { logger } = require("./common");
const { getCommand } = require("./flows/common/common-helper");

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
                ? ` It has been rebased onto ${checkInfo.targetGroup}/${checkInfo.project}:${checkInfo.targetBranch}`
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
                ? `. Rebased onto ${checkInfo.targetGroup}/${checkInfo.project}:${checkInfo.targetBranch}`
                : ""
            }`
          )}`
        );
      }
    );
    logger.info("----------------------------------------------");
  }
}

function printExecutionPlanNode(node, levelType) {
  logger.emptyLine();
  logger.info(`[${node.project}]`);
  logger.info(`Level Type: [${levelType}].`);
  if (node.build && node.build.skip) {
    logger.info(`No command will be executed (the project is skipped).`);
  } else {
    if (
      node.build["build-command"].before &&
      getCommand(node.build["build-command"].before, levelType)
    ) {
      logger.info(getCommand(node.build["build-command"].before, levelType));
    }
    logger.info(getCommand(node.build["build-command"], levelType));
    if (
      node.build["build-command"].after &&
      getCommand(node.build["build-command"].after, levelType)
    ) {
      logger.info(getCommand(node.build["build-command"].after, levelType));
    }
  }
}

function printExecutionPlan(nodeChain, projectTriggeringJob) {
  if (nodeChain && Object.keys(nodeChain).length) {
    logger.info("----------------------------------------------");
    logger.info(`[${Object.keys(nodeChain).length}] projects will be executed`);

    const projectTriggeringJobIndex = nodeChain.findIndex(
      node => node.project === projectTriggeringJob
    );
    if (projectTriggeringJobIndex < 0) {
      throw new Error(
        `The chain ${nodeChain.map(
          node => node.project
        )} does not contain the project triggering the job ${projectTriggeringJob}`
      );
    }
    Object.entries(nodeChain).forEach(([index, node]) =>
      printExecutionPlanNode(
        node,
        index < projectTriggeringJobIndex
          ? "upstream"
          : index == projectTriggeringJobIndex
          ? "current"
          : "downstream"
      )
    );

    logger.emptyLine();
    logger.info("----------------------------------------------");
  }
}

module.exports = {
  printCheckoutInformation,
  printExecutionPlan
};
