import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";

export class CommandBuilder {
  private treatedCommand: string;
  private readonly options: TreatmentOptions;

  constructor(command: string, options: TreatmentOptions) {
    this.treatedCommand = command;
    this.options = options;
  }

  public treat(commandTreatment: CommandTreatment): CommandBuilder {
    this.treatedCommand = commandTreatment.treat(this.treatedCommand, this.options);
    return this;
  }

  public build(): string {
    return this.treatedCommand;
  }

}