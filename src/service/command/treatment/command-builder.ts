import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";

export class CommandBuilder {
  private content: string;
  private readonly command: string;
  private readonly options: TreatmentOptions;

  constructor(command: string, options: TreatmentOptions) {
    this.command = command;
    this.options = options;
    this.content = "";
  }

  public treat(commandTreatment: CommandTreatment): CommandBuilder {
    return this.append(commandTreatment.treat(this.command, this.options));
  }

  private append(additionalContent: string): CommandBuilder {
    this.content = `${this.content}${additionalContent}`;
    return this;
  }

  public build(): string {
    return this.content;
  }

}