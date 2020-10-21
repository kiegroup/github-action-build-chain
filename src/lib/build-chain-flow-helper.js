const {
  clone,
  doesBranchExist,
  merge: gitMerge,
  hasPullRequest,
  getForkedProject
} = require("./git");
const { logger } = require("./common");
const {
  parentChainFromNode
} = require("@kie/build-chain-configuration-reader");

async function checkoutDefinitionTree(context, treeNode) {
  const nodeChain = await parentChainFromNode(treeNode);
  let currentTargetBranch = context.config.github.targetBranch;
  for (const node of [...nodeChain].reverse()) {
    try {
      node.checkoutInfo = await checkoutProject(
        context,
        node,
        currentTargetBranch
      );
      currentTargetBranch = node.checkoutInfo.targetBranch;
    } catch (err) {
      logger.error(`Error checking out project ${node.project}`);
      throw err;
    }
  }

  return nodeChain;
}

async function checkoutProject(context, node, currentTargetBranch) {
  logger.info(`Checking out project ${node.project}`);
  const dir = getDir(context.config.rootFolder, node.project);
  const checkoutInfo = await getCheckoutInfo(
    context,
    node.repo.group,
    node.repo.name,
    currentTargetBranch,
    node.mapping
  );
  if (checkoutInfo == undefined) {
    const msg = `Trying to checking out ${node.project} into '${dir}'. It does not exist.`;
    logger.error(msg);
    throw new Error(msg);
  }
  if (checkoutInfo.merge) {
    logger.info(
      `Merging ${context.config.github.serverUrl}/${node.repo.group}/${node.project}:${checkoutInfo.targetBranch} into ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}`
    );
    try {
      await clone(
        `${context.config.github.serverUrl}/${node.project}`,
        dir,
        checkoutInfo.targetBranch
      );
    } catch (err) {
      logger.error(
        `Error checking out (before merging)  ${context.config.github.serverUrl}/${node.repo.group}/${node.project}:${context.config.github.targetBranch}`
      );
      throw err;
    }
    try {
      await gitMerge(
        dir,
        checkoutInfo.group,
        checkoutInfo.project,
        checkoutInfo.branch
      );
    } catch (err) {
      logger.error(
        `Error merging ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}. Please manually merge it and relaunch.`
      );
      throw err;
    }
  } else {
    try {
      logger.info(
        `Checking out '${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}'  into '${dir}'`
      );
      await clone(
        `${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}`,
        dir,
        checkoutInfo.branch
      );
    } catch (err) {
      logger.error(
        `Error checking out ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}.`
      );
      throw err;
    }
  }
  return checkoutInfo;
}

async function getCheckoutInfo(
  context,
  targetGroup,
  targetProject,
  currentTargetBranch,
  mapping
) {
  const sourceGroup = context.config.github.sourceGroup;
  const sourceBranch = context.config.github.sourceBranch;
  const targetBranch =
    mapping && mapping.source === currentTargetBranch
      ? mapping.target
      : currentTargetBranch;
  const forkedProjectName = await getForkedProjectName(
    context.octokit,
    targetGroup,
    targetProject,
    sourceGroup
  );
  logger.info(
    `Getting checkout Info for ${targetProject}. sourceProject: ${forkedProjectName} sourceGroup: ${sourceGroup}. sourceBranch: ${sourceBranch}. targetGroup: ${targetGroup}. targetBranch: ${targetBranch}. Mapping: ${
      mapping
        ? "source:" + mapping.source + " target:" + mapping.target
        : "not defined"
    }`
  );
  return (await doesBranchExist(
    context.octokit,
    sourceGroup,
    forkedProjectName,
    sourceBranch
  ))
    ? {
        project: forkedProjectName,
        group: sourceGroup,
        branch: sourceBranch,
        targetGroup,
        targetBranch,
        merge: await hasPullRequest(
          context.octokit,
          targetGroup,
          targetProject,
          sourceBranch,
          context.config.github.author
        )
      }
    : (await doesBranchExist(
        context.octokit,
        targetGroup,
        targetProject,
        sourceBranch
      ))
    ? {
        project: targetProject,
        group: targetGroup,
        branch: sourceBranch,
        targetGroup,
        targetBranch,
        merge: await hasPullRequest(
          context.octokit,
          targetGroup,
          targetProject,
          sourceBranch,
          context.config.github.author
        )
      }
    : (await doesBranchExist(
        context.octokit,
        targetGroup,
        targetProject,
        targetBranch
      ))
    ? {
        project: targetProject,
        group: targetGroup,
        branch: targetBranch,
        targetGroup,
        targetBranch,
        merge: false
      }
    : undefined;
}

function getDir(rootFolder, project) {
  const folder =
    rootFolder !== undefined && rootFolder !== "" ? rootFolder : ".";
  return `${folder}/${project.replace(/ |-/g, "_")}`;
}

async function getForkedProjectName(octokit, owner, project, wantedOwner) {
  if (owner !== wantedOwner) {
    const forkedProject = await getForkedProject(
      octokit,
      owner,
      project,
      wantedOwner
    );
    return !forkedProject || !forkedProject.name ? project : forkedProject.name;
  } else {
    return project;
  }
}

/**
 * it returns back the placeholders in case the URL is defined with `${}` expressions
 * @param {Object} context @see {@link ./config.js}
 */
function getUrlPlaceHolders(context) {
  return {
    GROUP: context.config.github.sourceGroup,
    PROJECT_NAME: context.config.github.project,
    BRANCH: context.config.github.sourceBranch
  };
}

module.exports = {
  checkoutDefinitionTree,
  getCheckoutInfo,
  getDir,
  getUrlPlaceHolders
};
