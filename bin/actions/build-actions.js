const {
  executeLocally: pullRequestLocalFlow
} = require("../flows/build-chain-pull-request");
const {
  executeLocally: fdLocalFlow
} = require("../flows/build-chain-full-downstream");
const {
  executeLocally: singleLocalFlow
} = require("../flows/build-chain-single");
const {
  executeLocally: branchLocalFlow
} = require("../flows/build-chain-branch");

const { addLocalExecutionVariables } = require("../bin-utils");

async function execute(args, token, octokit) {
  if (args.build === "pr") {
    await pullRequestLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0]
    );
  }
  if (args.build === "fd") {
    await fdLocalFlow(token, octokit, process.env, args.folder[0], args.url[0]);
  }
  if (args.build === "single") {
    await singleLocalFlow(
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
