const noTreatment = require("./no-treatment");
const mavenTreatment = require("./maven-treatment");

function treatCommand(command) {
  let libraryToExecute = noTreatment;
  if (command.match(/.*mvn .*/)) {
    libraryToExecute = mavenTreatment;
  }
  return libraryToExecute.treat(command);
}

module.exports = {
  treatCommand
};
