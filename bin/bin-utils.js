const process = require("process");

const { ArgumentParser } = require("argparse");
const { Octokit } = require("@octokit/rest");
const { ClientError } = require("../src/lib/common");
const { formatDate } = require("../src/lib/util/date-util");
const pkg = require("../package.json");
require("dotenv").config();

/**
 * Gets an environment variable value
 * @param {String} name the environment variable name
 */
function getProcessEnvVariable(name) {
  const val = process.env[name];
  if (!val || !val.length) {
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

function getArguments() {
  const parser = new ArgumentParser({
    prog: pkg.name,
    add_help: true,
    description: `${pkg.description}. Version: ${pkg.version}`
  });

  parser.add_argument("-d", "--debug", {
    action: "store_true",
    help: "Show debugging output"
  });
  parser.add_argument("-url", {
    metavar: "<URL>",
    nargs: 1,
    help: "GitHub URL to process instead of environment variables"
  });
  parser.add_argument("-df", {
    nargs: 1,
    required: true,
    help: "Filesystem path or URL to the definition file"
  });
  parser.add_argument("-f", "-flow", {
    nargs: 1,
    help: "flow to execute. 'pr' by default",
    default: ["pr"],
    choices: ["pr", "branch"]
  });
  parser.add_argument("-p", "-project", {
    nargs: 1,
    help:
      "the project (one which is defined in dependencies file) to start build from in case the 'branch' is the selected flow"
  });
  parser.add_argument("-ps", "-project-start", {
    nargs: 1,
    help:
      "the project (one which is defined in dependencies file) to start building in case the 'branch' is the selected flow"
  });
  parser.add_argument("-g", "-group", {
    nargs: 1,
    help:
      "the group to execute flow. It will take it from project argument in case it's not specified"
  });
  parser.add_argument("-b", "-branch", {
    nargs: 1,
    help: "the branch to execute flow in case the 'branch' is the selected flow"
  });
  parser.add_argument("-c", "-command", {
    nargs: "*",
    help:
      "the command(s) to execute for every project. This will override definition file configuration (just dependency tree will be taken into account)."
  });
  parser.add_argument("--skipExecution", {
    action: "store_true",
    help: "If you want to skip command(s) execution(s)."
  });
  parser.add_argument("-folder", {
    nargs: 1,
    default: [getDefaultRootFolder()],
    help:
      "the folder to store execution. by default bc_execution_TIMESTAMP (where TIMESTAMP will be yyyymmddHHMMss format date)"
  });
  return parser.parse_args();
}

function getDefaultRootFolder() {
  return `build_chain_${formatDate(new Date())}`;
}

function createOctokitInstance(token) {
  return new Octokit({
    auth: `token ${token}`,
    userAgent: "kiegroup/github-build-chain-action"
  });
}

function isLocallyExecution(args) {
  return args.df;
}

module.exports = {
  addLocalExecutionVariables,
  getArguments,
  createOctokitInstance,
  isLocallyExecution,
  getProcessEnvVariable,
  getDefaultRootFolder
};
