function getArguments(subParser) {
  const buildParser = subParser.add_parser("build", {
    help: "build functionallities"
  });
  const buildSubParser = buildParser.add_subparsers({
    dest: "build",
    required: true
  });
  pullRequestArguments(buildSubParser);
  branchArguments(buildSubParser);
  fdArguments(buildSubParser);
  singleArguments(buildSubParser);
}

function pullRequestArguments(subParser) {
  const parser = subParser.add_parser("pr", {
    help: "pull request flow. It will build projects based on their branches"
  });
  parser.add_argument("-url", {
    metavar: "<URL>",
    nargs: 1,
    required: true,
    help: "GitHub URL to pull request"
  });
  parser.add_argument("-sp", "-starting-project", {
    nargs: 1,
    help:
      "the project (one which is defined in dependencies file) to start building from"
  });
}

function branchArguments(subParser) {
  const parser = subParser.add_parser("branch", {
    help: "branch flow. It will build projects based on their branches"
  });
  parser.add_argument("-p", "-project", {
    nargs: 1,
    required: true,
    help:
      "the project (one which is defined in dependencies file) to start the build"
  });
  parser.add_argument("-b", "-branch", {
    nargs: 1,
    required: true,
    help: "the branch to execute flow"
  });
  parser.add_argument("-sp", "-starting-project", {
    nargs: 1,
    help:
      "the project (one which is defined in dependencies file) to start building from"
  });
  parser.add_argument("-g", "-group", {
    nargs: 1,
    help:
      "the group to execute flow. It will take it from project argument in case it's not specified"
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
}

function fdArguments(subParser) {
  const parser = subParser.add_parser("fd", {
    help: "full downstream flow"
  });
  parser.add_argument("-url", {
    metavar: "<URL>",
    nargs: 1,
    required: true,
    help: "GitHub URL to pull request"
  });
  parser.add_argument("-sp", "-starting-project", {
    nargs: 1,
    help:
      "the project (one which is defined in dependencies file) to start building from"
  });
}

function singleArguments(subParser) {
  const parser = subParser.add_parser("single", {
    help: "singe flow. Just the project from the url event is treated."
  });
  parser.add_argument("-url", {
    metavar: "<URL>",
    nargs: 1,
    required: true,
    help: "GitHub URL to pull request"
  });
}

module.exports = { getArguments };
