const noTreatment = require("./no-treatment");
const mavenTreatment = require("./maven-treatment");
const envionmentVariablesTreament = require("./environment-variables-treatment");

function treatCommand(command) {
  const commandVariablesTreated = envionmentVariablesTreament.treat(command);
  let libraryToExecute = noTreatment;
  if (!excludeTreatment(commandVariablesTreated)) {
    if (commandVariablesTreated.match(/.*mvn .*/)) {
      libraryToExecute = mavenTreatment;
    }
  }
  return libraryToExecute.treat(commandVariablesTreated);
}

function excludeTreatment(command) {
  return (
    command.trim().match(/^export .*=/) || command.trim().match(/^echo .*/)
  );
}

module.exports = {
  treatCommand
};
