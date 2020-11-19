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
const { copyNodeFolder } = require("../../util/fs-util");
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
        cloneNode(context.config.rootFolder, node);
        return result;
      } catch (err) {
        throw { project: node.project, message: err };
      }
    })
  )
    .then(result => {
      return result.reduce((acc, curr) => {
        acc[curr.project] = curr.checkoutInfo;
        return acc;
      }, {});
    })
    .catch(err => {
      logger.error(`[${err.project}] Error checking it out. ${err.message}`);
      throw err.message;
    });
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
    await checkoutNode(context, node, checkoutInfo, dir);
    return checkoutInfo;
  } else {
    logger.info(
      `[${node.project}] folder ${dir} already exists, nothing to checkout`
    );
    return undefined;
  }
}

/**
 * It checks out the node repository
 *
 * @param {Object} context the application context
 * @param {Object} node the node to obtain checkout info
 * @param {Object} checkoutInfo the checkout information
 * @param {Object} dir the dir to check out
 */
async function checkoutNode(context, node, checkoutInfo, dir) {
  if (checkoutInfo.merge) {
    logger.info(
      `[${node.project}] Merging ${context.config.github.serverUrl}/${node.project}:${checkoutInfo.targetBranch} into ${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}`
    );
    try {
      await clone(
        `${context.config.github.serverUrlWithToken}/${node.project}`,
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
        `${context.config.github.serverUrlWithToken}/${checkoutInfo.group}/${checkoutInfo.project}`,
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
        `${context.config.github.serverUrlWithToken}/${checkoutInfo.group}/${checkoutInfo.project}`,
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
        `${context.config.github.serverUrlWithToken}/${checkoutInfo.group}/${checkoutInfo.project}`,
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

/**
 * it gets the checkout information for the node argument based on event and node triggering the job information
 *
 * @param {Object} context the application context
 * @param {Object} node the node to obtain checkout info
 * @param {Object} nodeTriggeringTheJob the node triggering the job
 */
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
  return `${folder}/${project.replace(/ |-/g, "_").replace("/", "_")}`;
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
async function getPlaceHolders(context, definitionFile) {
  if (definitionFile.startsWith("http") && definitionFile.includes("${")) {
    const placeHolderSource = {
      GROUP: context.config.github.sourceGroup,
      PROJECT_NAME: context.config.github.project,
      BRANCH: context.config.github.sourceBranch
    };
    const sourceUrl = treatUrl(definitionFile, placeHolderSource);
    if (!(await checkUrlExist(sourceUrl))) {
      const placeHoldersTargetSource = {
        GROUP: context.config.github.group,
        PROJECT_NAME: context.config.github.project,
        BRANCH: context.config.github.sourceBranch
      };
      const targetSourceUrl = treatUrl(
        definitionFile,
        placeHoldersTargetSource
      );
      if (!(await checkUrlExist(targetSourceUrl))) {
        const placeHoldersTarget = {
          GROUP: context.config.github.group,
          PROJECT_NAME: context.config.github.project,
          BRANCH: context.config.github.targetBranch
        };
        const targetUrl = treatUrl(definitionFile, placeHoldersTarget);
        if (!(await checkUrlExist(targetUrl))) {
          throw new Error(
            `Definition file ${definitionFile} does not exist for any of these cases: ${sourceUrl}, ${targetSourceUrl} or ${targetUrl}`
          );
        } else {
          return placeHoldersTarget;
        }
      } else {
        return placeHoldersTargetSource;
      }
    } else {
      return placeHolderSource;
    }
  }
  return {};
}

/**
 * It will clone project folder as many times as `node.build.clone` specifies
 *
 * @param {String} rootFolder the folder where the build chain is storing the information
 * @param {Object} node the node to clone
 */
function cloneNode(rootFolder, node) {
  if (node.build && node.build.clone) {
    const sourceFolder = getDir(rootFolder, node.project);
    logger.info(
      `[${node.project}] Clonning folder ${sourceFolder} into ${node.build.clone}`
    );
    const clonedFolders = copyNodeFolder(
      rootFolder,
      sourceFolder,
      node.build.clone
    );
    logger.info(
      `[${node.project}] Clonned folder ${sourceFolder} into ${clonedFolders}`
    );
  }
}

module.exports = {
  checkoutDefinitionTree,
  getCheckoutInfo,
  getDir,
  getPlaceHolders,
  getMapping
};
