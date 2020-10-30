const {
  executeLocally: pullRequestLocalFlow
} = require("../flows/build-chain-pull-request");
const { executeLocally: fdbLocalFlow } = require("../flows/build-chain-fdb");
const {
  executeLocally: branchLocalFlow
} = require("../flows/build-chain-branch");

const { addLocalExecutionVariables } = require("../bin-utils");

const assert = require("assert");

async function execute(args, token, octokit) {
  if (args.build === "pr") {
    assert(
      args.url && args.url.length > 0,
      "URL has not been defined, please define one following instructions"
    );
    await pullRequestLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0]
    );
  }
  if (args.build === "fdb") {
    assert(
      args.url && args.url.length > 0,
      "URL has not been defined, please define one following instructions"
    );
    await fdbLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0]
    );
  }
  if (args.build === "branch") {
    addLocalExecutionVariables({
      "starting-project": { value: args.p[0], mandatory: true }
    });
    await branchLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.g ? args.g[0] : undefined,
      args.p[0],
      args.b[0],
      {
        command: args.c ? args.c[0] : undefined,
        projectToStart: args.ps ? args.ps[0] : undefined,
        skipExecution: args.skipExecution
      }
    );
  }
}

module.exports = { execute };
