import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { Service } from "typedi";

@Service()
export class EnvironmentCommandTreatment implements CommandTreatment {

  // eslint-disable-next-line
  public treat(command: string, _options?: TreatmentOptions): string {
    const variables = this.getVariablesFromCommand(command);
    return variables?.length > 0 ? variables.reduce(
      (acc, variable) => acc.replace(variable[0], process.env[variable[1]] ?? ""),
      command,
    ) : command;
  }

  private getVariablesFromCommand(command: string): RegExpMatchArray[] {
    return [...command.matchAll(/\${{ env\.(\w+) }}/g)];
  }

}