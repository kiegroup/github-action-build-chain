const { clone } = require("./git");

async function executeGitHubAction(context) {
  const parentDependencies = context['config'] && context['config']['parentDependencies'] ? context['config']['parentDependencies'] : undefined;
  const childDependencies = context['config'] && context['config']['childDependencies'] ? context['config']['childDependencies'] : undefined;
  await checkoutDependencies(context, [...parentDependencies, ...childDependencies]);
}

async function checkoutDependencies(context, dependencies) {
  console.log("Checking out dependencies", dependencies);
  dependencies.forEach(async (project) => {
    checkouProject(context, project);
  });
}

async function checkouProject(context, project) {
  const dir = getDir(project);
  const serverUrl = context['config']['github']['serverUrl'];
  const groupAndBranchToCheckout = await getGroupAndBranchToCheckout(context);
  const group = groupAndBranchToCheckout[0];
  const branch = groupAndBranchToCheckout[1];

  console.log(`Checking out ${serverUrl}${group}/${project}:${branch} into ${dir}`);
  try {
    await clone(`${serverUrl}${group}/${project}`, dir, branch);
  } catch (err) {
    console.error(`Error checking out ${serverUrl}${group}/${project}`, err);
  }
}

async function getGroupAndBranchToCheckout(context) {
  console.log('getGroupAndBranchToCheckout', context);
  return ['kiegroup', 'master']; // TODO: to return the proper branches
}

function getDir(project) {
  return project.replace(/ /g, '_').replace('-', '_'); // TODO: to properly replace
}

module.exports = { executeGitHubAction };