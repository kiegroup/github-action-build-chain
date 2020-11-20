const noTreatment = require("./no-treatment");
const mavenTreatment = require("./maven-treatment");

function treatCommand(command) {
  let libraryToExecute = noTreatment;
  if (!excludeTreatment(command)) {
    if (command.match(/.*mvn .*/)) {
      libraryToExecute = mavenTreatment;
    }
  }
  return libraryToExecute.treat(command);
}

function excludeTreatment(command) {
  return command.trim().match(/^export .*=/);
}

module.exports = {
  treatCommand
};
