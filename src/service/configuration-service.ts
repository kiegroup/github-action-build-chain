import { Configuration } from "@bc/domain/configuration";
import { Service } from "typedi";

@Service()
export class ConfigurationService {

  private readonly _configuration?: Configuration;

  get configuration(): Configuration | undefined {
    return this._configuration;
  }
}