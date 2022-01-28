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

const {
  addLocalExecutionVariables,
  treatSkipProjectCheckout
} = require("../utils/bin-utils");

async function execute(args, token, octokit) {
  if (args.build === "pr") {
    addLocalExecutionVariables({
      "starting-project": {
        value: args.sp ? args.sp[0] : undefined,
        mandatory: false
      }
    });
    await pullRequestLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0],
      {
        replaceExArray: args.cct,
        skipProjectCheckout: treatSkipProjectCheckout(args.spc),
        skipParallelCheckout: args.skipParallelCheckout,
        skipCheckout: args.skipCheckout,
        skipExecution: args.skipExecution
      }
    );
  }
  if (args.build === "fd") {
    addLocalExecutionVariables({
      "starting-project": {
        value: args.sp ? args.sp[0] : undefined,
        mandatory: false
      }
    });
    await fdLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0],
      {
        replaceExArray: args.cct,
        skipProjectCheckout: treatSkipProjectCheckout(args.spc),
        skipParallelCheckout: args.skipParallelCheckout,
        skipCheckout: args.skipCheckout,
        skipExecution: args.skipExecution
      }
    );
  }
  if (args.build === "single") {
    await singleLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0],
      {
        replaceExArray: args.cct,
        skipProjectCheckout: treatSkipProjectCheckout(args.spc),
        skipParallelCheckout: args.skipParallelCheckout,
        skipCheckout: args.skipCheckout,
        skipExecution: args.skipExecution
      }
    );
  }
  if (args.build === "branch") {
    addLocalExecutionVariables({
      "starting-project": {
        value: args.sp ? args.sp[0] : undefined,
        mandatory: true
      }
    });
    await branchLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.g ? args.g[0] : undefined,
      args.sp[0],
      args.b[0],
      {
        command: args.c ? args.c[0] : undefined,
        skipExecution: args.skipExecution,
        replaceExArray: args.cct,
        skipProjectCheckout: treatSkipProjectCheckout(args.spc),
        skipParallelCheckout: args.skipParallelCheckout,
        skipCheckout: args.skipCheckout,
        fullProjectDependencyTree: args.fullProjectDependencyTree
      }
    );
  }
}

module.exports = { execute };
