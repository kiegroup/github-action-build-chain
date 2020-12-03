const { logger } = require("../../common");

/**
 *
 * @param {String} command the command to treat
 * @param {Array} replaceExArray an array containing "regex||expression to replace"
 */
function treat(command, replaceExArray) {
  if (replaceExArray) {
    logger.info(
      `[REGEX COMMAND REPLACEMENT] Replacing command: '${command}' by expressions: '${replaceExArray}'`
    );
    const result = replaceExArray.reduce(
      (acc, replaceEx) => treatReplaceEx(acc, replaceEx),
      command
    );
    logger.info(
      result === command
        ? `[REGEX COMMAND REPLACEMENT] No replacement for ${command}`
        : `[REGEX COMMAND REPLACEMENT] Replaced to: '${result}'`
    );
    return result;
  } else {
    return command;
  }
}

function treatReplaceEx(command, replaceEx) {
  const replacemenExpression = getReplacemenExpression(replaceEx);
  return command.replace(
    replacemenExpression.regEx,
    replacemenExpression.replace
  );
}

function getReplacemenExpression(replaceEx) {
  const split = replaceEx.split("||");
  return { regEx: createRegex(split[0]), replace: split[1] };
}

function createRegex(str) {
  const [, literal, flag] = str.split("/");
  return literal
    ? flag
      ? new RegExp(literal, flag)
      : new RegExp(literal)
    : new RegExp(str);
}

module.exports = {
  treat
};
