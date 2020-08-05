const fs = require("fs");
const path = require("path");
const { clone, doesBranchExist } = require("./git");
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
  const serverUrl = context.config.github.serverUrl;
  const groupAndBranchToCheckout = await getGroupAndBranchToCheckout(
    context,
    project,
    dependencyInformation.mapping
  );
  if (groupAndBranchToCheckout == undefined) {
    const msg = `Trying to checking out ${project} into '${dir}'. It does not exist.`;
    logger.error(msg);
    throw new Error(msg);
  }
  const group = groupAndBranchToCheckout[0];
  const branch = groupAndBranchToCheckout[1];
  const shouldMerge = groupAndBranchToCheckout[2];
  logger.info(
    `Checking out '${serverUrl}/${group}/${project}:${branch}'  into '${dir}'. Should merge? ${shouldMerge}.`
  );
  try {
    await clone(`${serverUrl}/${group}/${project}`, dir, branch);
    // TODO: merge in case shouldMerge
  } catch (err) {
    console.error(`Error checking out ${serverUrl}/${group}/${project}`, err);
  }
}

async function getGroupAndBranchToCheckout(context, project, mapping) {
  const sourceGroup = context.config.github.author;
  const sourceBranch = context.config.github.sourceBranch;
  const targetGroup = context.config.github.group;
  const targetBranch =
    mapping && mapping.source === context.config.github.targetBranch
      ? mapping.target
      : context.config.github.targetBranch;
  logger.info(
    `getGroupAndBranchToCheckout ${project}. sourceGroup: ${sourceGroup}. sourceBranch: ${sourceBranch}. targetGroup: ${targetGroup}. targetBranch: ${targetBranch}. Mapping: ${mapping}`
  );
  return (await doesBranchExist(
    context.octokit,
    sourceGroup,
    project,
    sourceBranch
  ))
    ? [sourceGroup, sourceBranch, true]
    : (await doesBranchExist(
      context.octokit,
      targetGroup,
      project,
      sourceBranch
    ))
      ? [targetGroup, sourceBranch, true]
      : (await doesBranchExist(
        context.octokit,
        targetGroup,
        project,
        targetBranch
      ))
        ? [targetGroup, targetBranch, false]
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
  console.log('Object.keys(workflowData.jobs)[jobName]', Object.keys(workflowData.jobs)[jobName]);
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
  getGroupAndBranchToCheckout,
  getDir,
  readWorkflowInformation
};
