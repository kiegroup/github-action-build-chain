const { logger } = require("../../common");
const { execute: bashExecute } = require("./bash-execution");
require("dotenv").config();

async function execute(cwd, command) {
  logger.info(
    "Treating export command since it's not possible to run it from the runner itself"
  );
  const variableToStore = getVariable(command);
  const expressionValue = await executeExpression(cwd, getExpression(command));

  logger.info(
    `The variable ${variableToStore} has been stored with '${expressionValue}' value`
  );
  process.env[variableToStore] = expressionValue;
}

async function executeExpression(cwd, exportExpression) {
  const commandFromExpression = exportExpression.match(/`(.*)`/)
    ? exportExpression.match(/`(.*)`/)[1]
    : undefined;

  if (commandFromExpression) {
    logger.info(`Executing ${commandFromExpression} from export expression.`);
    let myOutput = "";
    let myError = "";
    const options = {
      listeners: {
        stdout: data => {
          myOutput = myOutput.concat(data.toString());
        },
        stderr: data => {
          myError = myError.concat(data.toString());
        }
      }
    };
    await bashExecute(cwd, commandFromExpression, options);
    return myOutput;
  }
  return exportExpression
    ? exportExpression.replace(/['"]+/g, "")
    : exportExpression;
}

function getVariable(command) {
  return getCommandArray(command)[1];
}

function getExpression(command) {
  return getCommandArray(command)[2];
}

function getCommandArray(command) {
  const commandArray = command.match(/^export (\w+)=(.*)/);
  if (commandArray.length != 3) {
    throw new Error(
      `The export command ${command} is not properly defined. It should be something like "export VARIBLE=expression". Please fix it an try again.`
    );
  }
  return commandArray;
}

module.exports = {
  execute
};
