import { exec } from "@actions/exec";
import { Service } from "typedi";
import { BashExecutor } from "@bc/service/executor/bash-executor";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

@Service()
export class ExportCommandExecutor implements CommandExecutor {

  constructor(private bashExecutor: BashExecutor) {
  }

  async execute(command: string, cwd?: string): Promise<void> {
    const expressionCommand = new ExpressionCommand(command);
    if (expressionCommand.variable && expressionCommand.expression) {
      let myOutput = "";
      const options = {
        listeners: {
          stdout: (data: Buffer) => {
            myOutput += data.toString();
          },
        },
        cwd,
      };

      await exec(expressionCommand.expression, [], options);
      process.env[expressionCommand.variable] = myOutput ?? expressionCommand.expression.replace(/['"]+/g, "");
    } else {
      LoggerServiceFactory.getInstance().warn(`No variable or expression for command \`${command}\``);
    }
  }
}

class ExpressionCommand {
  _variable: string;
  _expression?: string;

  constructor(command: string) {
    const commandArray = this.getCommandArray(command);
    this._variable = commandArray[0];

    const exportExpressionMatch = commandArray[1].match(/`(.*)`/);
    this._expression = exportExpressionMatch ? exportExpressionMatch[1] : undefined;
  }

  private getCommandArray(command: string): string[] {
    const commandArray = command.match(/^export (\w+)=(.*)/);
    if (!commandArray || commandArray.length !== 3) {
      throw new Error(
        `The export command ${command} is not properly defined. It should be something like "export VARIBLE=expression". Please fix it an try again.`,
      );
    }
    return commandArray;
  }

  get variable(): string {
    return this._variable;
  }

  get expression(): string | undefined {
    return this._expression;
  }
}