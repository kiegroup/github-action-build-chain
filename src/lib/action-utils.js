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
  return treatCommands(core.getInput('build-command'));
}

function getBuildCommandUpstream() {
  return treatCommands(core.getInput('build-command-upstream'));
}

function getBuildCommandDownstream() {
  return treatCommands(core.getInput('build-command-downstream'));
}

function treatCommands(command) {
  return command ? command.split('|').map(item => item.trim()) : undefined;
}

module.exports = {
  getParentDependencies,
  getChildDependencies,
  getBuildCommandUpstream,
  getBuildCommandDownstream,
  getBuildCommand
};
