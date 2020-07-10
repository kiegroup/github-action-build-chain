const core = require('@actions/core');
const { dependenciesToArray } = require("./common");

function getParentDependencies() {
  return dependenciesToArray(core.getInput('parent-dependencies'));
}

function getChildDependencies() {
  // return ['pep', 'juan']
  return dependenciesToArray(core.getInput('child-dependencies'));
}

function getBuildCommand() {
  return core.getInput('build-command');
}

function getBuildCommandUpstream() {
  return core.getInput('build-command-upstream');
}

function getBuildCommandDownstream() {
  return core.getInput('build-command-downstream');
}

module.exports = {
  getParentDependencies,
  getChildDependencies,
  getBuildCommandUpstream,
  getBuildCommandDownstream,
  getBuildCommand
};
