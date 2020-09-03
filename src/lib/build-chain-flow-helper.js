const {
  clone,
  doesBranchExist,
  merge: gitMerge,
  hasPullRequest,
  getForkedProject
} = require("./git");
const { logger } = require("./common");
const { saveCheckoutInfo } = require("./context");

async function checkoutDependencies(
  context,
  dependencies,
  currentTargetBranch
) {
  const result = {};
  for (const dependencyKey of Object.keys(dependencies)) {
    result[dependencyKey] = await checkoutProject(
      context,
      dependencyKey,
      dependencies[dependencyKey],
      currentTargetBranch
    );
  }
  return result;
}

async function checkoutProject(
  context,
  project,
  dependencyInformation,
  currentTargetBranch
) {
  const dir = getDir(context.config.rootFolder, project);
  const checkoutInfo = await getCheckoutInfo(
    context,
    dependencyInformation.group,
    project,
    currentTargetBranch,
    dependencyInformation.mapping
  );
  if (checkoutInfo == undefined) {
    const msg = `Trying to checking out ${project} into '${dir}'. It does not exist.`;
    logger.error(msg);
    throw new Error(msg);
  }

  if (checkoutInfo.merge) {
    logger.info(
      `Merging ${context.config.github.serverUrl}/${dependencyInformation.group}/${project}:${checkoutInfo.targetBranch} into ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}`
    );
    try {
      await clone(
        `${context.config.github.serverUrl}/${dependencyInformation.group}/${project}`,
        dir,
        checkoutInfo.targetBranch
      );
    } catch (err) {
      logger.error(
        `Error checking out (before merging)  ${context.config.github.serverUrl}/${dependencyInformation.group}/${project}:${context.config.github.targetBranch}`
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
  saveCheckoutInfo(context, project, checkoutInfo);
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

module.exports = {
  checkoutDependencies,
  checkoutProject,
  getCheckoutInfo,
  getDir
};
