const noTreatment = require("./no-treatment");
const mavenTreatment = require("./maven-treatment");
const envionmentVariablesTreament = require("./environment-variables-treatment");
const concatTreatment = require("./concat-treatment");

function treatCommand(command, options = {}) {
  const commandConcatTreated = concatTreatment.treat(
    command,
    options ? options.concatCommand : undefined
  );
  const commandVariablesTreated = envionmentVariablesTreament.treat(
    commandConcatTreated
  );
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
