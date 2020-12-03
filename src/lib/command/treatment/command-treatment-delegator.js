const noTreatment = require("./no-treatment");
const mavenTreatment = require("./maven-treatment");
const envionmentVariablesTreament = require("./environment-variables-treatment");
const regExTreatment = require("./regex-treatment");

function treatCommand(command, options = {}) {
  const commandVariablesTreated = envionmentVariablesTreament.treat(command);
  let libraryToExecute = noTreatment;
  if (!excludeTreatment(commandVariablesTreated)) {
    if (commandVariablesTreated.match(/.*mvn .*/)) {
      libraryToExecute = mavenTreatment;
    }
  }
  return regExTreatment.treat(
    libraryToExecute.treat(commandVariablesTreated),
    options.replaceExArray
  );
}

function excludeTreatment(command) {
  return (
    command.trim().match(/^export .*=/) || command.trim().match(/^echo .*/)
  );
}

module.exports = {
  treatCommand
};
