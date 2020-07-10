const fs = require("fs");
const path = require('path');
const { clone, doesBranchExist } = require("./git");
const { logger, dependenciesToArray } = require("./common");
const { getYamlFileContent } = require('./fs-helper');

async function checkoutDependencies(context, dependencies) {
  logger.info("Checking out dependencies", dependencies);
  for (const project of dependencies.filter(a => a !== null && a !== '')) {
    await checkouProject(context, project);
  }
}

async function checkouProject(context, project) {
  const dir = getDir(project);
  const serverUrl = context.config.github.serverUrl;
  const groupAndBranchToCheckout = await getGroupAndBranchToCheckout(context, project);
  if (groupAndBranchToCheckout == undefined) {
    const msg = `Trying to checking out ${project} into '${dir}'. It does not exist.`;
    logger.error(msg);
    throw new Error(msg);
  }
  const group = groupAndBranchToCheckout[0];
  const branch = groupAndBranchToCheckout[1];
  const shouldMerge = groupAndBranchToCheckout[2];
  logger.info(`Checking out '${serverUrl}/${group}/${project}:${branch}'  into '${dir}'. Should merge? ${shouldMerge}.`);
  try {
    await clone(`${serverUrl}/${group}/${project}`, dir, branch);
    // TODO: merge is case shouldMerge
  } catch (err) {
    console.error(`Error checking out ${serverUrl}/${group}/${project}`, err);
  }
}

async function getGroupAndBranchToCheckout(context, project) {
  const sourceGroup = context.config.github.author;
  const sourceBranch = context.config.github.sourceBranch;
  const targetGroup = context.config.github.group;
  const targetBranch = context.config.github.targetBranch;
  logger.debug(`getGroupAndBranchToCheckout ${project}. sourceGroup: ${sourceGroup}. sourceBranch: ${sourceBranch}. targetGroup: ${targetGroup}. targetBranch: ${targetBranch}.`);
  return await doesBranchExist(context.octokit, sourceGroup, project, sourceBranch) ? [sourceGroup, sourceBranch, true] :
    await doesBranchExist(context.octokit, targetGroup, project, sourceBranch) ? [targetGroup, sourceBranch, true] :
      await doesBranchExist(context.octokit, targetGroup, project, targetBranch) ? [targetGroup, targetBranch, false] : undefined;
}

function getDir(project) {
  return project.replace(/ |-/g, '_');
}

function readWorkflowInformation(workflowFilePath, dir = '.') {
  const filePath = path.join(dir, workflowFilePath);
  if (!fs.existsSync(filePath)) {
    logger.warn(`file ${filePath} does not exist`);
    return undefined;
  }
  return parseWorkflowInformation(getYamlFileContent(filePath));
}

function parseWorkflowInformation(workflowData) {
  const buildChainKey = Object.keys(workflowData.jobs).find(key => workflowData.jobs[key].steps.find(step => step.uses && step.uses.includes('github-action-build-chain')));
  const buildChainStep = workflowData.jobs[buildChainKey].steps.find(step => step.uses && step.uses.includes('github-action-build-chain'));
  return {
    'id': buildChainStep.id,
    'name': buildChainStep.name,
    'buildCommand': buildChainStep.with['build-command'],
    'buildCommandUpstream': buildChainStep.with['build-command-upstream'],
    'buildCommandDownstream': buildChainStep.with['build-command-downstream'],
    'childDependencies': dependenciesToArray(buildChainStep.with['child-dependencies']),
    'parentDependencies': dependenciesToArray(buildChainStep.with['parent-dependencies'])
  };
}

module.exports = {
  checkoutDependencies,
  checkouProject,
  getGroupAndBranchToCheckout,
  getDir,
  readWorkflowInformation
};