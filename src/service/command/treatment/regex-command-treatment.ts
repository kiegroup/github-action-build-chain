import { Service } from "typedi";
import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

@Service()
export class RegexCommandTreatment implements CommandTreatment {

  treat(command: string, options: TreatmentOptions): string {
    if (options.replaceExpressions) {
      LoggerServiceFactory.getInstance().info(`[REGEX COMMAND REPLACEMENT] Replacing command: \`${command}\` by expressions: '${options.replaceExpressions}'`);
      const result = options.replaceExpressions.reduce(
        (acc, replaceEx) => this.treatReplaceEx(acc, replaceEx),
        command,
      );
      LoggerServiceFactory.getInstance().info(
        result === command
          ? `[REGEX COMMAND REPLACEMENT] No replacement for \`${command}\``
          : `[REGEX COMMAND REPLACEMENT] Replaced to: \`${result}\``,
      );
      return result;
    } else {
      return command;
    }
  }

  private treatReplaceEx(command: string, replaceExpression: string) {
    const replacementExpression = this.getReplacementExpression(replaceExpression);
    return command.replace(
      replacementExpression.regEx,
      replacementExpression.replace,
    );
  }

  private getReplacementExpression(replaceExpression: string): ReplacementExpression {
    const split = replaceExpression.split("||");
    return new ReplacementExpression(this.createRegex(split[0]), split[1]);
  }

  private createRegex(replaceExpression: string): RegExp {
    const [, literal, flag] = replaceExpression.split("/");
    return literal
      ? flag
        ? new RegExp(literal, flag)
        : new RegExp(literal)
      : new RegExp(replaceExpression);
  }
}

class ReplacementExpression {
  private readonly _regEx: RegExp;
  private readonly _replace: string;

  constructor(regEx: RegExp, replace: string) {
    this._regEx = regEx;
    this._replace = replace;
  }

  get regEx(): RegExp {
    return this._regEx;
  }

  get replace(): string {
    return this._replace;
  }
}