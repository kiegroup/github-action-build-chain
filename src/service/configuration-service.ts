// TODO: Shift import 'reflect-metadata' to the actual entrypoint file whenever it's ready
import 'reflect-metadata';

import { Configuration } from "@bc/domain/configuration";
import { EntryPoint } from "@bc/domain/entry-point";

export class ConfigurationService {

  private readonly _configuration: Configuration;
  private static instance: ConfigurationService;

  // TODO: to be implemented
  private constructor() {
    this._configuration = { entryPoint: EntryPoint.CLI };
  }

  public static getInstance() {
    if (ConfigurationService.instance == null) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  get configuration(): Configuration {
    return this._configuration;
  }
}