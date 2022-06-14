import { Service } from "typedi";
import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";

@Service()
export class MavenCommandTreatment implements CommandTreatment {

  treat(command: string, options: TreatmentOptions): string {
    return this.excludeTreatment(command) ? command : `${command} -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B`;
  }

  private excludeTreatment(command: string): boolean {
    return command.match(/.*mvn .*/) !== null;
  }


}