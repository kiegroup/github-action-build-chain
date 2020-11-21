const bashExecution = require("./bash-execution");
const exportExecution = require("./export-execution");

async function executeCommand(cwd, command) {
  let libraryToExecute = bashExecution;
  if (isExport(command)) {
    libraryToExecute = exportExecution;
  }
  return await libraryToExecute.execute(cwd, command);
}

function isExport(command) {
  return command.trim().match(/^export .*=/);
}

module.exports = {
  executeCommand
};
