const core = require('@actions/core');

function getParentDependencies() {
  return getDependenciesAsArray(core.getInput('parent-dependencies'));
}

function getChildDependencies() {
  return getDependenciesAsArray(core.getInput('child-dependencies'));
}

function getDependenciesAsArray(dependencies) {
  return dependencies.split(",").map(item => item.trim());
}

module.exports = {
  getParentDependencies,
  getChildDependencies
};
