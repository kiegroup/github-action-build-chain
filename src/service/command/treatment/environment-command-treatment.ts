import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { Service } from "typedi";

@Service()
export class EnvironmentCommandTreatment implements CommandTreatment {

  // eslint-disable-next-line
  public treat(command: string, options?: TreatmentOptions): string {
    const variables = this.getVariablesFromCommand(command);
    const treatedCommand = variables?.length > 0 ? variables.reduce(
      (acc, variable) =>
        acc.replace(variable[0], process.env[variable[1]] || ""),
      command,
    ) : command;
    return this.excludeTreatment(treatedCommand) ? command : treatedCommand;
  }

  private getVariablesFromCommand(command: string): RegExpMatchArray[] {
    return [...command.matchAll(/\${{ env\.(\w+) }}/g)];
  }

  private excludeTreatment(command: string): boolean {
    return (command.trim().match(/^export .*=/) !== null || command.trim().match(/^echo .*/) !== null);
  }

}