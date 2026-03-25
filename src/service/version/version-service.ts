import Container, { Service } from "typedi";
import { BaseLoggerService } from "../logger/base-logger-service";
import { LoggerService } from "../logger/logger-service";
import * as fs from "fs";


@Service()
export class GitCLIService {
    private readonly logger: BaseLoggerService;

    constructor() {
        this.logger = Container.get(LoggerService).logger;
    }


    async version(): Promise<string | undefined> {
        const packagePath = __dirname + "/package.json";
        let version: string | undefined = undefined;
        try {
            const content = fs.readFileSync(packagePath, "utf8");
            const packageInfo = JSON.parse(content);
            version = packageInfo.version;
            this.logger.info("Package version: " + version);
        } catch (err) {
            this.logger.error("Unable to read package.json: " + (err as Error).message);
        }
        return version;
    }

}