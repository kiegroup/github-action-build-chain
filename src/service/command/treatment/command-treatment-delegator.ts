import { Service } from "typedi";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { CommandBuilder } from "@bc/service/command/treatment/command-builder";
import { EnvironmentCommandTreatment } from "@bc/service/command/treatment/environment-command-treatment";
import { MavenCommandTreatment } from "@bc/service/command/treatment/maven-command-treatment";
import { RegexCommandTreatment } from "@bc/service/command/treatment/regex-command-treatment";

@Service()
export class CommandTreatmentDelegator {

  constructor(private _environmentCommandTreatment: EnvironmentCommandTreatment,
              private _mavenCommandTreatment: MavenCommandTreatment,
              private _regexCommandTreatment: RegexCommandTreatment) {
  }

  public treatCommand(command: string, options?: TreatmentOptions): string {
    return new CommandBuilder(command, options)
      .treat(this._environmentCommandTreatment)
      .treat(this._mavenCommandTreatment)
      .treat(this._regexCommandTreatment)
      .build();
  }
}