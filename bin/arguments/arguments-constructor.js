const { ArgumentParser } = require("argparse");
const { getArguments: getBuildArguments } = require("./build-arguments");
const { getArguments: getToolsArguments } = require("./tools-arguments");
const { getDefaultRootFolder } = require("../utils/bin-utils");
const pkg = require("../../package.json");

function getArguments() {
  const parser = new ArgumentParser({
    prog: pkg.name,
    add_help: true,
    description: `${pkg.description}. Version: ${pkg.version}`
  });
  parser.add_argument("-df", {
    nargs: 1,
    required: true,
    help: "Filesystem path or URL to the definition file"
  });
  parser.add_argument("-folder", {
    nargs: 1,
    default: [getDefaultRootFolder()],
    help:
      "the folder to store execution. by default bc_execution_TIMESTAMP (where TIMESTAMP will be yyyymmddHHMMss format date)"
  });
  parser.add_argument("-token", "--token", {
    nargs: 1,
    required: false,
    help: "The GITHUB_TOKEN. It can be set throw environment variable instead"
  });
  parser.add_argument("-d", "--debug", {
    action: "store_true",
    help: "Show debugging output"
  });

  const subparsers = parser.add_subparsers({ dest: "action", required: true });
  getBuildArguments(subparsers);
  getToolsArguments(subparsers);
  return parser.parse_args();
}

module.exports = { getArguments };
