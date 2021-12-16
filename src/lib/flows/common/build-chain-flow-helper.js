const {
  clone,
  doesBranchExist,
  rename: gitRename,
  merge: gitMerge,
  hasPullRequest,
  getForkedProject,
  getRepository
} = require("../../git");
const { logger } = require("../../common");
const { treatUrl } = require("@kie/build-chain-configuration-reader");
const { checkUrlExist } = require("../../util/http");
const { getNodeTriggeringJob } = require("../../util/chain-util");
const { copyNodeFolder } = require("../../util/fs-util");
const fs = require("fs");
const path = require("path");

async function checkoutDefinitionTree(
  context,
  nodeChain,
  flow = "pr",
  options = { skipProjectCheckout: new Map(), skipParallelCheckout: false }
) {
  options.skipProjectCheckout = [null, undefined].includes(
    options.skipProjectCheckout
  )
    ? new Map()
    : options.skipProjectCheckout;
  const result = options.skipParallelCheckout
    ? await checkoutDefinitionTreeSequencial(context, nodeChain, flow, options)
    : await checkoutDefinitionTreeParallel(context, nodeChain, flow, options);
  return result;
}

async function checkoutDefinitionTreeParallel(
  context,
  nodeChain,
  flow,
  options
) {
  const nodeTriggeringTheJob = getNodeTriggeringJob(context, nodeChain);

  logger.debug(
    "nodeTriggeringTheJob",
    nodeTriggeringTheJob ? nodeTriggeringTheJob.project : undefined
  );

  return Promise.all(
    nodeChain.map(async node => {
      try {
        const skipCheckout =
          options.skipCheckout || options.skipProjectCheckout.get(node.project);
        const result = Promise.resolve({
          project: node.project,
          checkoutInfo: await checkoutAndComposeInfo(
            context,
            node,
            nodeTriggeringTheJob,
            flow,
            skipCheckout
          )
        });
        logger.info(
          `[${node.project}] ${
            skipCheckout ? "Check out skipped." : "Checked out."
          }`
        );
        if (!skipCheckout) {
          cloneNode(
            context.config.rootFolder,
            node,
            getDir(
              context.config.rootFolder,
              node.project,
              options.skipProjectCheckout.get(node.project)
            )
          );
        }
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

async function checkoutDefinitionTreeSequencial(
  context,
  nodeChain,
  flow,
  options
) {
  const result = [];
  const nodeTriggeringTheJob = getNodeTriggeringJob(context, nodeChain);
  logger.debug("nodeTriggeringTheJob", nodeTriggeringTheJob);

  for (const node of nodeChain) {
    try {
      const skipCheckout =
        options.skipCheckout || options.skipProjectCheckout.get(node.project);
      result.push({
        project: node.project,
        checkoutInfo: await checkoutAndComposeInfo(
          context,
          node,
          nodeTriggeringTheJob,
          flow,
          skipCheckout
        )
      });
      logger.info(
        `[${node.project}] ${
          skipCheckout ? "Check out skipped." : "Checked out."
        }`
      );
      if (!skipCheckout) {
        cloneNode(
          context.config.rootFolder,
          node,
          getDir(
            context.config.rootFolder,
            node.project,
            options.skipProjectCheckout.get(node.project)
          )
        );
      }
    } catch (err) {
      logger.error(`Error checking out project ${node.project}`);
      throw err;
    }
  }

  return result.reduce((acc, curr) => {
    acc[curr.project] = curr.checkoutInfo;
    return acc;
  }, {});
}

async function checkoutAndComposeInfo(
  context,
  node,
  nodeTriggeringTheJob,
  flow,
  skipCheckout
) {
  return flow === "pr"
    ? await checkoutProjectPullRequestFlow(
        context,
        node,
        nodeTriggeringTheJob,
        skipCheckout
      )
    : await checkoutProjectBranchFlow(
        context,
        node,
        nodeTriggeringTheJob,
        skipCheckout
      );
}

async function checkoutProjectPullRequestFlow(
  context,
  node,
  nodeTriggeringTheJob,
  skipCheckout
) {
  logger.info(`[${node.project}] Checking out project`);
  const dir = getDir(context.config.rootFolder, node.project);
  if (!fs.existsSync(dir)) {
    const checkoutInfo = await getCheckoutInfo(
      context,
      node,
      nodeTriggeringTheJob,
      true
    );
    if (checkoutInfo == undefined) {
      const msg = `[${node.project}] Trying to checking out ${node.project} into '${dir}'. It does not exist.`;
      logger.error(msg);
      throw new Error(msg);
    }
    if (!skipCheckout) {
      await checkoutNode(context, node, checkoutInfo, dir);
    }
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
        `[${node.project}] Error checking out (before merging) ${context.config.github.serverUrl}/${node.repo.group}/${node.project}:${context.config.github.targetBranch}`
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
    try {
      await gitRename(dir, checkoutInfo.branch);
    } catch (err) {
      logger.error(
        `[${node.project}] Error renaming branch (after merging) to ${checkoutInfo.branch}.`
      );
      throw err;
    }
  } else {
    try {
      logger.info(
        `[${node.project}] Checking out '${context.config.github.serverUrl}/${checkoutInfo.group}/${checkoutInfo.project}:${checkoutInfo.branch}' into '${dir}'`
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

async function checkoutProjectBranchFlow(
  context,
  node,
  nodeTriggeringTheJob,
  skipCheckout
) {
  logger.info(`[${node.project}] Checking out project`);
  const dir = getDir(context.config.rootFolder, node.project);
  if (!fs.existsSync(dir)) {
    const checkoutInfo = await getCheckoutInfo(
      context,
      node,
      nodeTriggeringTheJob,
      false
    );

    if (checkoutInfo == undefined) {
      const msg = `Trying to checking out ${node.project} into '${dir}'. It does not exist.`;
      logger.error(msg);
      throw new Error(msg);
    }
    if (!skipCheckout) {
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
    }
    return checkoutInfo;
  } else {
    logger.info(`folder ${dir} already exists, nothing to checkout`);
    return undefined;
  }
}

async function composeCheckoutInfo(
  context,
  group,
  project,
  branch,
  targetGroup,
  targetBranch,
  targetProject,
  isPullRequest,
  checkMerge = true
) {
  const branchExists = await doesBranchExist(
    context.octokit,
    group,
    project,
    branch
  );
  const hasPullRequestValue =
    branchExists && (isPullRequest || checkMerge)
      ? await hasPullRequest(
          context.octokit,
          targetGroup,
          targetProject,
          branch,
          context.config.github.author
        )
      : undefined;
  return (!isPullRequest || hasPullRequestValue) && branchExists
    ? {
        project,
        group,
        branch,
        targetGroup,
        targetBranch,
        merge: checkMerge ? hasPullRequestValue : false
      }
    : undefined;
}

/**
 * it gets the checkout information for the node argument based on event and node triggering the job information
 *
 * @param {Object} context the application context
 * @param {Object} node the node to obtain checkout info
 * @param {Object} nodeTriggeringTheJob the node triggering the job
 */
async function getCheckoutInfo(
  context,
  node,
  nodeTriggeringTheJob,
  isPullRequest
) {
  const sourceGroup = context.config.github.sourceGroup;
  const sourceBranch = context.config.github.sourceBranch;
  const targetGroup = node.repo.group;
  const targetProject = node.repo.name;
  const targetBranch = getTarget(
    nodeTriggeringTheJob.project,
    nodeTriggeringTheJob.mapping,
    node.project,
    node.mapping,
    context.config.github.targetBranch
  );

  const forkedProjectName = await getForkedProjectName(
    context.octokit,
    targetGroup,
    targetProject,
    sourceGroup
  );
  logger.debug(
    `[${targetGroup}/${targetProject}] Getting checkout Info. sourceProject: ${forkedProjectName} sourceGroup: ${sourceGroup}. sourceBranch: ${sourceBranch}. targetGroup: ${targetGroup}. targetBranch: ${targetBranch}. Mapping target: ${targetBranch}`
  );

  const sourceGroupSourceBranch = await composeCheckoutInfo(
    context,
    sourceGroup,
    forkedProjectName,
    sourceBranch,
    targetGroup,
    targetBranch,
    targetProject,
    isPullRequest
  );
  if (sourceGroupSourceBranch) {
    return sourceGroupSourceBranch;
  }

  const targetGroupSourceBranch = await composeCheckoutInfo(
    context,
    targetGroup,
    targetProject,
    sourceBranch,
    targetGroup,
    targetBranch,
    targetProject,
    isPullRequest
  );
  if (targetGroupSourceBranch) {
    return targetGroupSourceBranch;
  }

  const targetGroupTargetBranch = await composeCheckoutInfo(
    context,
    targetGroup,
    targetProject,
    targetBranch,
    targetGroup,
    targetBranch,
    targetProject,
    false,
    false
  );
  return targetGroupTargetBranch;
}

/**
 * it returns back the target object based on the mapping object
 * @param {String} projectTriggeringTheJob the project name of the project triggering the job
 * @param {Object} projectTriggeringTheJobMapping the mapping object of the project triggering the job
 * @param {String} currentProject the project name of the current project
 * @param {Object} currentProjectMapping the mappinf object of the current project
 * @param {String} targetBranch the target branch
 */
function getTarget(
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
      const mapping =
        getMappingInfo(
          currentProject,
          projectTriggeringTheJobMapping.dependencies[currentProject],
          targetBranch
        ) ||
        getMappingInfo(
          currentProject,
          projectTriggeringTheJobMapping.dependencies.default,
          targetBranch
        );
      if (mapping) {
        return mapping.target;
      }
      // If the current project has a mapping and the source matched with the targetBranch then this mapping is taken
    }
    if (
      currentProjectMapping &&
      currentProjectMapping.dependant &&
      (currentProjectMapping.exclude
        ? !currentProjectMapping.exclude.includes(projectTriggeringTheJob)
        : true)
    ) {
      const mapping =
        getMappingInfo(
          currentProject,
          currentProjectMapping.dependant[projectTriggeringTheJob],
          targetBranch
        ) ||
        getMappingInfo(
          currentProject,
          currentProjectMapping.dependant.default,
          targetBranch
        );
      if (mapping) {
        return mapping.target;
      }
    }
  }
  return targetBranch;
}

function getMappingInfo(currentProject, mapping, sourceBranch) {
  if (mapping) {
    // The exact match has precedence over the regex
    const foundMappingEqual = mapping.filter(e => e.source === sourceBranch);
    const foundMappingRegex = mapping.filter(e =>
      sourceBranch.match(new RegExp(`^${e.source}$`))
    );
    const foundMapping =
      foundMappingEqual && foundMappingEqual.length
        ? foundMappingEqual
        : foundMappingRegex;
    if (foundMapping.length) {
      const found = foundMapping[0];
      if (foundMapping.length > 1) {
        logger.warn(
          `The mapping for ${currentProject} has a duplication for source branch ${sourceBranch}. First matching ${found.target} will be used.`
        );
      }
      return found;
    }
  }
  return undefined;
}

function getDir(rootFolder, project, skipCheckoutProjectFolder = undefined) {
  if (skipCheckoutProjectFolder) {
    return skipCheckoutProjectFolder;
  }
  const folder =
    rootFolder !== undefined && rootFolder !== "" ? rootFolder : ".";
  return `${path.join(folder, project.replace(/ |-/g, "_").replace("/", "_"))}`;
}

async function getForkedProjectName(octokit, owner, project, wantedOwner) {
  if (owner !== wantedOwner) {
    const forkedProject =
      (await getRepository(octokit, wantedOwner, project)) ||
      (await getForkedProject(octokit, owner, project, wantedOwner));
    return !forkedProject || !forkedProject.name ? project : forkedProject.name;
  } else {
    return project;
  }
}

async function doesDefinitionFilePlaceHolderExists(
  definitionFile,
  placeHolder,
  token
) {
  const url = treatUrl(definitionFile, placeHolder);
  const doesUrlExist = await checkUrlExist(url, token);
  doesUrlExist
    ? logger.info(`${url} exists, using it`)
    : logger.warn(`${url} does not exists.`);
  return doesUrlExist ? url : undefined;
}

/**
 * it composes an object with default values for placeholders
 *
 * @param {string} definitionFile the definition file url
 */
function getPlaceHoldersDefaultValues(definitionFile) {
  const result = {};

  const placeHolderExpression = /\${([^$]+)}/g;

  let placeHolderMatch;
  while ((placeHolderMatch = placeHolderExpression.exec(definitionFile))) {
    const placeHolder = placeHolderMatch[1];
    logger.debug(`Placeholder group found ${placeHolder}`);

    const defaultValueExpression = /(.*):(.*)/g;
    const defaultValueMatch = defaultValueExpression.exec(placeHolder);

    logger.debug(`Placeholder value match. ${placeHolder}.`, defaultValueMatch);
    if (defaultValueMatch !== null) {
      logger.debug(
        `Placeholder key and value. ${defaultValueMatch[1]}: ${defaultValueMatch[2]}`
      );
      result[defaultValueMatch[1]] = defaultValueMatch[2];
    }
  }

  logger.debug(
    `getPlaceHoldersDefaultValues. definitionFile: ${definitionFile}:`,
    result
  );
  return result;
}

/**
 * it checks what's the proper URL to retrieve definition from in case a URL with ${} expression is defined. It will try sourceGroup/sourceBranch then targetGroup/sourceBranch and then targetGroup/targetBranch in this order.
 * @param {Object} context the context information
 * @param {string} definitionFile the definition file path or URL
 * @param {Object} defaulPlaceHolders default placeholders to be overwrite
 */
async function getPlaceHolders(
  context,
  definitionFile,
  defaulPlaceHolders = {}
) {
  let placeHolders =
    context && context.config && context.config.github
      ? {
          GROUP: context.config.github.sourceGroup,
          PROJECT_NAME: context.config.github.project,
          BRANCH: context.config.github.sourceBranch,
          ...defaulPlaceHolders
        }
      : { ...defaulPlaceHolders };
  if (definitionFile.startsWith("http") && definitionFile.includes("${")) {
    const sourceUrl = await doesDefinitionFilePlaceHolderExists(
      definitionFile,
      placeHolders,
      context.token
    );
    if (!sourceUrl) {
      placeHolders = {
        GROUP: context.config.github.group,
        PROJECT_NAME: context.config.github.project,
        BRANCH: context.config.github.targetBranch,
        ...defaulPlaceHolders
      };
      const targetTargetUrl = await doesDefinitionFilePlaceHolderExists(
        definitionFile,
        placeHolders,
        context.token
      );
      if (!targetTargetUrl) {
        placeHolders = {
          GROUP: context.config.github.group,
          PROJECT_NAME: context.config.github.project,
          BRANCH: context.config.github.sourceBranch,
          ...defaulPlaceHolders
        };
        const targetSourceUrl = await doesDefinitionFilePlaceHolderExists(
          definitionFile,
          placeHolders,
          context.token
        );
        if (!targetSourceUrl) {
          placeHolders = getPlaceHoldersDefaultValues(definitionFile);
          if (
            ![null, undefined].includes(placeHolders) &&
            Object.keys(placeHolders).length > 0
          ) {
            placeHolders = getPlaceHolders(
              context,
              treatUrl(definitionFile, placeHolders),
              placeHolders
            );
          } else {
            throw new Error(
              `Definition file ${definitionFile} does not exist for any case. Not default values defined for placeholders.`
            );
          }
        }
      }
    }
  } else if (definitionFile.startsWith("http")) {
    logger.info(`${definitionFile} exists, using it`);
  }
  return placeHolders;
}

/**
 * It will clone project folder as many times as `node.build.clone` specifies
 *
 * @param {String} rootFolder the folder where the build chain is storing the information
 * @param {Object} node the node to clone
 * @param {String} sourceFolder the folder to clone
 */
function cloneNode(rootFolder, node, sourceFolder) {
  if (node.build && node.build.clone) {
    logger.info(
      `[${node.project}] Cloning folder ${sourceFolder} into ${node.build.clone}`
    );
    const clonedFolders = copyNodeFolder(
      rootFolder,
      sourceFolder,
      node.build.clone
    );
    logger.info(
      `[${node.project}] Cloned folder ${sourceFolder} into ${clonedFolders}`
    );
  }
}

module.exports = {
  checkoutDefinitionTree,
  getCheckoutInfo,
  getDir,
  getPlaceHolders,
  getTarget,
  getForkedProjectName,
  getPlaceHoldersDefaultValues
};
