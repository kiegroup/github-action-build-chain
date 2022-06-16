import { Configuration } from "@bc/domain/configuration";
import { Service } from "typedi";

@Service()
export class ConfigurationService {

  private readonly _configuration?: Configuration;

  constructor() {
    this._configuration = { token: "token" };
  }

  get configuration(): Configuration | undefined {
    return this._configuration;
  }
}