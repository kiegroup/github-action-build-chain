import { Service } from "typedi";
import { ExecuteCommandResult } from "@bc/domain/execute-command-result.";
import { CommandTreatmentDelegator } from "@bc/service/command/treatment/command-treatment-delegator";
import { ConfigurationService } from "@bc/service/configuration-service";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";

@Service()
export class ExecuteCommandService {

  private _commandTreatmentDelegator: CommandTreatmentDelegator;
  private _configurationService: ConfigurationService;
  private _commandExecutorDelegator: CommandExecutorDelegator;

  constructor(commandTreatmentDelegator: CommandTreatmentDelegator, commandExecutorDelegator: CommandExecutorDelegator, configurationService: ConfigurationService) {
    this._commandTreatmentDelegator = commandTreatmentDelegator;
    this._configurationService = configurationService;
    this._commandExecutorDelegator = commandExecutorDelegator;
  }

  public async executeCommand(command: string, cwd?: string): Promise<ExecuteCommandResult> {
    const treatedCommand = this._commandTreatmentDelegator.treatCommand(command, this._configurationService.configuration?.treatmentOptions);
    return await this._commandExecutorDelegator.executeCommand(treatedCommand, cwd);
  }
}