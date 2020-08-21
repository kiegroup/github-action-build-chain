const core = require("@actions/core");

function getWorkflowfileName() {
  return core.getInput("workflow-file-name");
}

module.exports = {
  getWorkflowfileName
};
