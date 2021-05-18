require("dotenv").config();

function treat(command) {
  const variables = getVariablesFromCommand(command);
  if (variables && variables.length > 0) {
    return variables.reduce(
      (acc, variable) =>
        acc.replace(variable[0], process.env[variable[1]] || ""),
      command
    );
  } else {
    return command;
  }
}

/**
 * it will return an array of arrays with [${{ env.VARIABLE }}, VARIABLE] elements
 * @param {String} command the command to get variables from
 */
function getVariablesFromCommand(command) {
  return [...command.matchAll(/\${{ env\.(\w+) }}/g)];
}

module.exports = {
  treat
};
