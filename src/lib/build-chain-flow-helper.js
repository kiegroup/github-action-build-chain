const fs = require("fs");
const path = require("path");
const {
  clone,
  doesBranchExist,
  merge: gitMerge,
  hasPullRequest
} = require("./git");
const { logger, dependenciesToObject } = require("./common");
const { getYamlFileContent } = require("./fs-helper");
var assert = require("assert");

async function checkoutDependencies(context, dependencies) {
  for (const dependencyKey of Object.keys(dependencies)) {
    await checkouProject(context, dependencyKey, dependencies[dependencyKey]);
  }
}

async function checkouProject(context, project, dependencyInformation) {
  const dir = getDir(project);
  const checkoutInfo = await getCheckoutInfo(
    context,
    project,
    dependencyInformation.mapping
  );
  if (checkoutInfo == undefined) {
    const msg = `Trying to checking out ${project} into '${dir}'. It does not exist.`;
    logger.error(msg);
    throw new Error(msg);
  }

  if (checkoutInfo.merge) {
    logger.info(
      `Merging ${context.config.github.serverUrl}/${context.config.github.group}/${project}:${context.config.github.targetBranch} into ${context.config.github.serverUrl}/${checkoutInfo.group}/${project}:${checkoutInfo.branch}`
    );
    try {
      await clone(
        `${context.config.github.serverUrl}/${context.config.github.group}/${project}`,
        dir,
        context.config.github.targetBranch
      );
    } catch (err) {
      logger.error(
        `Error checking out (before merging)  ${context.config.github.serverUrl}/${context.config.github.group}/${project}:${context.config.github.targetBranch}`
      );
      throw err;
    }
    try {
      await gitMerge(dir, checkoutInfo.group, project, checkoutInfo.branch);
    } catch (err) {
      logger.error(
        `Error merging ${context.config.github.serverUrl}/${checkoutInfo.group}/${project}:${checkoutInfo.branch}. Please manually merge it and relaunch.`
      );
      throw err;
    }
  } else {
    try {
      logger.info(
        `Checking out '${context.config.github.serverUrl}/${checkoutInfo.group}/${project}:${checkoutInfo.branch}'  into '${dir}'`
      );
      await clone(
        `${context.config.github.serverUrl}/${checkoutInfo.group}/${project}`,
        dir,
        checkoutInfo.branch
      );
    } catch (err) {
      logger.error(
        `Error checking out ${context.config.github.serverUrl}/${checkoutInfo.group}/${project}.`
      );
      throw err;
    }
  }
}

async function getCheckoutInfo(context, project, mapping) {
  const sourceGroup = context.config.github.author;
  const sourceBranch = context.config.github.sourceBranch;
  const targetGroup = context.config.github.group;
  const targetBranch =
    mapping && mapping.source === context.config.github.targetBranch
      ? mapping.target
      : context.config.github.targetBranch;
  logger.info(
    `Getting checkout Info for ${project}. sourceGroup: ${sourceGroup}. sourceBranch: ${sourceBranch}. targetGroup: ${targetGroup}. targetBranch: ${targetBranch}. Mapping: ${
      mapping
        ? "source:" + mapping.source + " target:" + mapping.target
        : "not defined"
    }`
  );
  return (await doesBranchExist(
    context.octokit,
    sourceGroup,
    project,
    sourceBranch
  ))
    ? {
        group: sourceGroup,
        branch: sourceBranch,
        merge: await hasPullRequest(
          context.octokit,
          targetGroup,
          project,
          sourceBranch,
          context.config.github.author
        )
      }
    : (await doesBranchExist(
        context.octokit,
        targetGroup,
        project,
        sourceBranch
      ))
    ? {
        group: targetGroup,
        branch: sourceBranch,
        merge: await hasPullRequest(
          context.octokit,
          targetGroup,
          project,
          sourceBranch,
          context.config.github.author
        )
      }
    : (await doesBranchExist(
        context.octokit,
        targetGroup,
        project,
        targetBranch
      ))
    ? { group: targetGroup, branch: targetBranch, merge: false }
    : undefined;
}

function getDir(project) {
  return project.replace(/ |-/g, "_");
}

function readWorkflowInformation(triggeringJobName, workflowFilePath, dir = ".") {
  const filePath = path.join(dir, workflowFilePath);
  if (!fs.existsSync(filePath)) {
    logger.warn(`file ${filePath} does not exist`);
    return undefined;
  }
  return parseWorkflowInformation(triggeringJobName, getYamlFileContent(filePath));
}

function parseWorkflowInformation(jobName, workflowData) {
  assert(workflowData.jobs[jobName], `The job id '${jobName}' does not exist`);  
  const buildChainStep = workflowData.jobs[jobName].steps.find(
    step => step.uses && step.uses.includes("github-action-build-chain")
  );
  return {
    id: buildChainStep.id,
    name: buildChainStep.name,
    buildCommands: treatCommand(buildChainStep.with["build-command"]),
    buildCommandsUpstream: treatCommand(
      buildChainStep.with["build-command-upstream"]
    ),
    buildCommandsDownstream: treatCommand(
      buildChainStep.with["build-command-downstream"]
    ),
    childDependencies: dependenciesToObject(
      buildChainStep.with["child-dependencies"]
    ),
    parentDependencies: dependenciesToObject(
      buildChainStep.with["parent-dependencies"]
    )
  };
}

function treatCommand(command) {
  return command ? command.split("|").map(item => item.trim()) : undefined;
}

module.exports = {
  checkoutDependencies,
  checkouProject,
  getCheckoutInfo,
  getDir,
  readWorkflowInformation
};
