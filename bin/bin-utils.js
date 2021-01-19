const process = require("process");

const { Octokit } = require("@octokit/rest");
const { ClientError } = require("../src/lib/common");
const { formatDate } = require("../src/lib/util/date-util");
require("dotenv").config();

/**
 * Gets an environment variable value
 * @param {String} name the environment variable name
 */
function getProcessEnvVariable(name, mandatory = true) {
  const val = process.env[name];
  if (mandatory && (!val || !val.length)) {
    throw new ClientError(`environment variable ${name} not set!`);
  }
  return val;
}

/**
 * The idea here is to add every env variable as an INPUT_X variable, this is the way github actions sets variables to the environment, so it's the way to introduce inputs from command line
 * @param {String} value the input variable value
 * @param {String} inputKey the input variable name
 * @param {Boolean} mandatory is the input variable mandatory
 */
function addInputVariableToEnv(value, inputKey, mandatory) {
  if (value) {
    process.env[`INPUT_${inputKey.replace(/ /g, "_").toUpperCase()}`] = value;
  } else if (mandatory) {
    throw new Error(
      `Input variable ${inputKey} is mandatory and it's not defined. Please add it following documentation.`
    );
  }
}

/**
 *
 * @param {Object} variables a map of variables following this pattern {String: {value: String, mandatory:Boolean}}
 */
function addLocalExecutionVariables(variables) {
  Object.entries(variables).forEach(([name, variable]) =>
    addInputVariableToEnv(variable.value, name, variable.mandatory)
  );
}

function getDefaultRootFolder() {
  return `build_chain_${formatDate(new Date())}`;
}

function createOctokitInstance(token) {
  return token
    ? new Octokit({
        auth: `token ${token}`,
        userAgent: "kiegroup/github-build-chain-action"
      })
    : new Octokit({
        userAgent: "kiegroup/github-build-chain-action"
      });
}

function treatSkipProjectCheckout(spc) {
  const map = new Map();
  if (spc && spc.length > 0) {
    spc.forEach(element => {
      const elementSplit = element.split("=");
      map.set(elementSplit[0], elementSplit[1]);
    });
  }
  return map;
}

module.exports = {
  addLocalExecutionVariables,
  createOctokitInstance,
  getProcessEnvVariable,
  getDefaultRootFolder,
  treatSkipProjectCheckout
};
