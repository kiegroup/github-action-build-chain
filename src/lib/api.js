const { clone } = require("./git");
// const { execute } = require('./command');
const exec = require('@actions/exec');

const { logger } = require("./common");

async function executeGitHubAction(context) {
  const parentDependencies = context['config'] && context['config']['parentDependencies'] ? context['config']['parentDependencies'] : undefined;
  const childDependencies = context['config'] && context['config']['childDependencies'] ? context['config']['childDependencies'] : undefined;
  await checkoutDependencies(context, [...parentDependencies, ...childDependencies]);
  await executeCommand([...parentDependencies, ...childDependencies], 'ls', '.');
  await executeCommand([...parentDependencies, ...childDependencies], 'mvn clean install -DskipTests');
}

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

async function executeCommand(dependencies, command) {
  for (const project of dependencies.filter(a => a !== null && a !== '')) {
    logger.info(`Execute command ${command} for project ${project} in dir ${getDir(project)}`);
    // logger.info(await execute(getDir(project), command, args));
    let myOutput = '';
    let myError = '';

    const options = {};
    options.listeners = {
      stdout: (data) => {
        myOutput += data.toString();
      },
      stderr: (data) => {
        myError += data.toString();
      }
    };
    options.cwd = getDir(project);
    await exec.exec(command, [], options);
  }
}

async function getGroupAndBranchToCheckout(context) {
  const group = context['config']['github']['author']; // TODO: properly get the group
  return [group, 'master']; // TODO: to return the proper branches
}

function getDir(project) {
  return project.replace(/ /g, '_').replace('-', '_'); // TODO: to properly replace
}

module.exports = { executeGitHubAction };