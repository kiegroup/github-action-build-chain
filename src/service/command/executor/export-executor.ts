import { exec } from "@actions/exec";
import Container, { Service } from "typedi";
import { LoggerService } from "@bc/service/logger/logger-service";

@Service()
export class ExportExecutor {

  async execute(command: string, cwd?: string): Promise<void> {
    const expressionCommand = new ExpressionCommand(command);
    process.env[expressionCommand.variable] = await this.executeExpression(expressionCommand.expression, cwd);
    Container.get(LoggerService).logger.debug(`The variable \`${expressionCommand.variable}\` has been set to the env with the value \`${process.env[expressionCommand.variable]}\``);
  }

  private async executeExpression(expression: string, cwd?: string): Promise<string> {
    const expressionMatch = expression.match(/`(.*)`/);
    const commandFromExpression = expressionMatch ? expressionMatch[1] : undefined;
    if (commandFromExpression) {
      let myOutput = "";
      const options = {
        listeners: {
          stdout: (data: Buffer) => {
            myOutput += data.toString();
          },
        },
        cwd,
      };
      await exec(commandFromExpression, [], options);
      return myOutput;
    }
    return expression.replace(/['"]+/g, "");
  }
}

class ExpressionCommand {
  _variable: string;
  _expression: string;

  constructor(command: string) {
    const commandArray = this.getCommandArray(command);
    this._variable = commandArray[1];
    this._expression = commandArray[2];
  }

  private getCommandArray(command: string): string[] {
    const commandArray = command.match(/^export (\w+)=(.*)/);
    if (!commandArray || commandArray.length !== 3) {
      const message = `The export command ${command} is not properly defined. It should be something like "export VARIBLE=expression". Please fix it an try again.`;
      Container.get(LoggerService).logger.error(message);
      throw new Error(message);
    }
    return commandArray;
  }

  get variable(): string {
    return this._variable;
  }

  get expression(): string {
    return this._expression;
  }
}