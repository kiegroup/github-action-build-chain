import { Service } from "typedi";
import { CommandTreatment } from "@bc/service/command/treatment/command-treatment";
import { TreatmentOptions } from "@bc/domain/treatment-options";

@Service()
export class MavenCommandTreatment implements CommandTreatment {

  public treat(command: string, options?: TreatmentOptions): string {
    return !this.isMavenCommand(command, options?.mavenBinary) ? command : `${command} -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B`;
  }

  private isMavenCommand(command: string, mavenBinary = "mvn"): boolean {
    return new RegExp(`.*${mavenBinary} .*`).test(command);
  }


}