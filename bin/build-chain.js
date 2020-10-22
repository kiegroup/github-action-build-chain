#!/usr/bin/env node

const process = require("process");

const fse = require("fs-extra");
const { ArgumentParser } = require("argparse");
const { Octokit } = require("@octokit/rest");

const { ClientError, logger } = require("../src/lib/common");
const { createConfig, createConfigLocally } = require("../src/lib/config");
const { executeGitHubAction } = require("../src/lib/api");

const pkg = require("../package.json");

async function main() {
  const parser = new ArgumentParser({
    prog: pkg.name,
    add_help: true,
    description: pkg.description
  });

  // parser.add_argument("-h", "--help", {
  //   action: "version",
  //   version: pkg.version
  // });
  parser.add_argument("-d", "--debug", {
    action: "store_true",
    help: "Show debugging output"
  });
  parser.add_argument("-url", {
    metavar: "<url>",
    nargs: 1,
    help: "GitHub URL to process instead of environment variables"
  });

  parser.add_argument("-df", {
    metavar: "<definition-file>",
    nargs: 1,
    help: "Filesystem path or URL to the definition file"
  });
  const args = parser.parse_args();

  if (args.trace) {
    logger.level = "trace";
  } else if (args.debug) {
    logger.level = "debug";
  }

  const token = env("GITHUB_TOKEN");
  const octokit = new Octokit({
    auth: `token ${token}`,
    userAgent: "kiegroup/github-build-chain-action"
  });

  let config = undefined;
  addInputVariableToEnv(args.df[0], "definition-file", true);
  if (args.url) {
    config = await createConfigLocally(octokit, args.url[0], process.env);
  } else {
    const eventPath = env("GITHUB_EVENT_PATH");
    const eventDataStr = await fse.readFile(eventPath, "utf8");
    const eventData = JSON.parse(eventDataStr);
    config = await createConfig(eventData, undefined, process.env);
  }

  const context = { token, octokit, config };
  await executeGitHubAction(context);
}

function env(name) {
  const val = process.env[name];
  if (!val || !val.length) {
    throw new ClientError(`environment variable ${name} not set!`);
  }
  return val;
}

/**
 * The idea here is to add every env variable as an INPUT_X variable, this is the way github actions sets variables to the environment, so it's the way to introduce inputs from command line
 * @param {String} inputVariable the input variable name
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

if (require.main === module) {
  main().catch(e => {
    if (e instanceof ClientError) {
      process.exitCode = 2;
      logger.error(e);
    } else {
      process.exitCode = 1;
      logger.error(e);
    }
  });
}
