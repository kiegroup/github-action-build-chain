const fs = require("fs");
const path = require('path');
const { clone } = require("./git");
const { execute } = require('./command');
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
  const serverUrl = context['config']['github']['serverUrl'];
  const groupAndBranchToCheckout = await getGroupAndBranchToCheckout(context);
  const group = groupAndBranchToCheckout[0];
  const branch = groupAndBranchToCheckout[1];

  logger.info(`Checking out ${serverUrl}/${group}/${project}:${branch} into ${dir}`);
  try {
    await clone(`${serverUrl}/${group}/${project}`, dir, branch);
  } catch (err) {
    console.error(`Error checking out ${serverUrl}/${group}/${project}`, err);
  }
}

async function executeSteps(dependencies) {
  for (const project of dependencies.filter(a => a !== null && a !== '')) {
    execute(getDir(project), 'mvn clean install -DskipTests');
  }
}

async function getGroupAndBranchToCheckout(context) {
  const group = context['config']['github']['author']; // TODO: properly get the group
  return [group, 'master']; // TODO: to return the proper branches
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
  executeSteps,
  getGroupAndBranchToCheckout,
  getDir,
  readWorkflowInformation
};