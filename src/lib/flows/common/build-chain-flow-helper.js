const {
  clone,
  doesBranchExist,
  merge: gitMerge,
  hasPullRequest,
  getForkedProject
} = require("../../git");
const { logger } = require("../../common");
const { treatUrl } = require("@kie/build-chain-configuration-reader");
const { checkUrlExist } = require("../../util/http");
const { getNodeTriggeringJob } = require("../../util/chain-util");
const fs = require("fs");

async function checkoutDefinitionTree(context, nodeChain, flow = "pr") {
  const nodeTriggeringTheJob = getNodeTriggeringJob(context, nodeChain);
  return Promise.all(
    nodeChain.map(async node => {
      try {
        const result = Promise.resolve({
          project: node.project,
          checkoutInfo:
            flow === "pr"
              ? await checkoutProjectPullRequestFlow(
                  context,
                  node,
                  nodeTriggeringTheJob
                )
              : await checkoutProjectBranchFlow(
                  context,
                  node,
                  nodeTriggeringTheJob
                )
        });
        logger.info(`[${node.project}] Checked out.`);
        return result;
      } catch (err) {
        return Promise.reject({ project: node.project, message: err });
      }
    })
  )
    .catch(err => {
      logger.error(
        `Error checking out project ${err.project}. Error: ${err.message}`
      );
    })
    .then(result =>
      result.reduce((acc, curr) => {
        acc[curr.project] = curr.checkoutInfo;
        return acc;
      }, {})
    );
}

async function checkoutProjectPullRequestFlow(
  context,
  node,
  nodeTriggeringTheJob
) {
  logger.info(`[${node.project}] Checking out project`);
  const dir = getDir(context.config.rootFolder, node.project);
  if (!fs.existsSync(dir)) {
    const checkoutInfo = await getCheckoutInfo(
      context,
      node,
      nodeTriggeringTheJob
    );

    if (checkoutInfo == undefined) {
      const msg = `[${node.project}] Trying to checking out ${node.project} into '${dir}'. It does not exist.`;
      logger.error(msg);
      throw new Error(msg);
    }
    if (checkoutInfo.merge) {
      logger.info(
        `[${node.project}] Merging ${context.config.github.serverUrl}/${node.project}:${checkoutInfo.targetBranch} into ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}`
      );
      try {
        await clone(
          `${context.config.github.serverUrl}/${node.project}`,
          dir,
          checkoutInfo.targetBranch
        );
      } catch (err) {
        logger.error(
          `[${node.project}] Error checking out (before merging)  ${context.config.github.serverUrl}/${node.repo.group}/${node.project}:${context.config.github.targetBranch}`
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
          `[${node.project}] Error merging ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}. Please manually merge it and relaunch.`
        );
        throw err;
      }
    } else {
      try {
        logger.info(
          `[${node.project}] Checking out '${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}'  into '${dir}'`
        );
        await clone(
          `${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}`,
          dir,
          checkoutInfo.branch
        );
      } catch (err) {
        logger.error(
          `[${node.project}] Error checking out ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}.`
        );
        throw err;
      }
    }
    return checkoutInfo;
  } else {
    logger.info(
      `[${node.project}] folder ${dir} already exists, nothing to checkout`
    );
    return undefined;
  }
}

async function checkoutProjectBranchFlow(context, node, nodeTriggeringTheJob) {
  logger.info(`[${node.project}] Checking out project`);
  const dir = getDir(context.config.rootFolder, node.project);
  if (!fs.existsSync(dir)) {
    const checkoutInfo = await getCheckoutInfo(
      context,
      node,
      nodeTriggeringTheJob
    );

    if (checkoutInfo == undefined) {
      const msg = `Trying to checking out ${node.project} into '${dir}'. It does not exist.`;
      logger.error(msg);
      throw new Error(msg);
    }
    try {
      logger.info(
        `Checking out '${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.targetBranch}'  into '${dir}'`
      );
      await clone(
        `${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}`,
        dir,
        checkoutInfo.targetBranch
      );
    } catch (err) {
      logger.error(
        `Error checking out ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}.`
      );
      throw err;
    }
    return checkoutInfo;
  } else {
    logger.info(`folder ${dir} already exists, nothing to checkout`);
    return undefined;
  }
}

async function getCheckoutInfo(context, node, nodeTriggeringTheJob) {
  const mapping = getMapping(
    nodeTriggeringTheJob.project,
    nodeTriggeringTheJob.mapping,
    node.project,
    node.mapping,
    context.config.github.targetBranch
  );
  const sourceGroup = context.config.github.sourceGroup;
  const sourceBranch = context.config.github.sourceBranch;
  const targetGroup = node.repo.group;
  const targetProject = node.repo.name;
  const targetBranch = mapping.target;
  const forkedProjectName = await getForkedProjectName(
    context.octokit,
    targetGroup,
    targetProject,
    sourceGroup
  );
  logger.info(
    `[${targetGroup}/${targetProject}] Getting checkout Info. sourceProject: ${forkedProjectName} sourceGroup: ${sourceGroup}. sourceBranch: ${sourceBranch}. targetGroup: ${targetGroup}. targetBranch: ${targetBranch}. Mapping: ${
      mapping.source
        ? "source:" + mapping.source + " target:" + mapping.target
        : "Not defined"
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

/**
 * it returns back a {source, target} object
 * @param {String} projectTriggeringTheJob the project name of the project triggering the job
 * @param {Object} projectTriggeringTheJobMapping the mapping object of the project triggering the job
 * @param {String} currentProject the project name of the current project
 * @param {Object} currentProjectMapping the mappinf object of the current project
 * @param {String} targetBranch the target branch
 */
function getMapping(
  projectTriggeringTheJob,
  projectTriggeringTheJobMapping,
  currentProject,
  currentProjectMapping,
  targetBranch
) {
  // If the current project it the project triggering the job there's no mapping
  if (currentProject !== projectTriggeringTheJob) {
    // If the current project has been excluded from the mapping, there's no mapping
    if (
      projectTriggeringTheJobMapping &&
      (projectTriggeringTheJobMapping.exclude
        ? !projectTriggeringTheJobMapping.exclude.includes(currentProject)
        : true)
    ) {
      // The mapping is either taken from the project mapping or from the default one
      const mapping = projectTriggeringTheJobMapping.dependencies[
        currentProject
      ]
        ? projectTriggeringTheJobMapping.dependencies[currentProject]
        : projectTriggeringTheJobMapping.dependencies.default;
      return { source: mapping.source, target: mapping.target };
      // If the current project has a mapping and the source matched with the targetBranch then this mapping is taken
    } else if (
      currentProjectMapping &&
      currentProjectMapping.source === targetBranch
    ) {
      return {
        source: currentProjectMapping.source,
        target: currentProjectMapping.target
      };
    } else {
      return { target: targetBranch };
    }
  } else {
    return { target: targetBranch };
  }
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
 * it checks what's the proper URL to retrieve definition from in case a URL with ${} expression is defined. It will try sourceGroup/sourceBranch then targetGroup/sourceBranch and then targetGroup/targetBranch in this order.
 * @param {Object} context the context information
 * @param {Object} definitionFile the definition file path or URL
 */
async function getFinalDefinitionFilePath(context, definitionFile) {
  if (definitionFile.startsWith("http") && definitionFile.includes("${")) {
    const sourceGroupAndBranchOption = treatUrl(definitionFile, {
      GROUP: context.config.github.sourceGroup,
      PROJECT_NAME: context.config.github.project,
      BRANCH: context.config.github.sourceBranch
    });
    if (!(await checkUrlExist(sourceGroupAndBranchOption))) {
      const targetGroupSourceBranchOption = treatUrl(definitionFile, {
        GROUP: context.config.github.group,
        PROJECT_NAME: context.config.github.project,
        BRANCH: context.config.github.sourceBranch
      });
      if (!(await checkUrlExist(targetGroupSourceBranchOption))) {
        const targetGroupAndBranchOption = treatUrl(definitionFile, {
          GROUP: context.config.github.group,
          PROJECT_NAME: context.config.github.project,
          BRANCH: context.config.github.targetBranch
        });
        if (!(await checkUrlExist(targetGroupAndBranchOption))) {
          throw new Error(
            `Definition file ${definitionFile} does not exist for any of these cases: ${sourceGroupAndBranchOption}, ${targetGroupSourceBranchOption} or ${targetGroupAndBranchOption}`
          );
        } else {
          return targetGroupAndBranchOption;
        }
      } else {
        return targetGroupSourceBranchOption;
      }
    } else {
      return sourceGroupAndBranchOption;
    }
  }
  return definitionFile;
}

module.exports = {
  checkoutDefinitionTree,
  getCheckoutInfo,
  getDir,
  getFinalDefinitionFilePath,
  getMapping
};
