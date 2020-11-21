const { logger } = require("../../common");
const exec = require("@actions/exec");
require("dotenv").config();

async function execute(cwd, command) {
  logger.info(
    "Treating export command since it's not possible to run it from the runner itself"
  );
  const variableToStore = getVariable(command);
  const expressionValue = await getValueFromExpression(
    cwd,
    getExpression(command)
  );

  logger.info(
    `The variable ${variableToStore} has been stored with '${expressionValue}' value`
  );
  process.env[variableToStore] = expressionValue;
}

async function getValueFromExpression(cwd, exportExpression) {
  const commandFromExpression = exportExpression.match(/`(.*)`/)
    ? exportExpression.match(/`(.*)`/)[1]
    : undefined;

  if (commandFromExpression) {
    logger.info(`Executing ${commandFromExpression} from export expression.`);
    let myOutput = "";
    let myError = "";
    const options = {};
    options.cwd = cwd;
    options.listeners = {
      stdout: data => {
        myOutput = myOutput.concat(data.toString());
      },
      stderr: data => {
        myError = myError.concat(data.toString());
      }
    };
    await exec.exec(commandFromExpression, [], options);
    logger.info(`${exportExpression} executed with value: "${myOutput}".`);
    return myOutput;
  }

  return exportExpression;
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
