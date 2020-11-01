function getArguments(subParser) {
  const buildParser = subParser.add_parser("tools", {
    help: "additional tools"
  });
  const toolsSubParser = buildParser.add_subparsers({
    dest: "tools",
    required: true
  });
  pullRequestArguments(toolsSubParser);
}

function pullRequestArguments(subParser) {
  const parser = subParser.add_parser("project-list", {
    help: "it will print a ordered  by precendence list of projects"
  });
  parser.add_argument("--skipGroup", {
    action: "store_true",
    help: "To remove group from project list"
  });
}

module.exports = { getArguments };
