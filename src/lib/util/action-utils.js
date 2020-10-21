const core = require("@actions/core");

function getDefinitionFile() {
  return core.getInput("definition-file");
}

module.exports = {
  getDefinitionFile
};
