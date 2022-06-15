import { BuildActionType, CLIActionType } from "@bc/domain/cli";
import { CommandConstructor } from "@bc/service/arguments/command-constructor";
import { Command } from "commander";

export abstract class AbstractPullRequestCommand implements CommandConstructor {
    private readonly description: string;
    private readonly type: BuildActionType;

    constructor(description: string, type: BuildActionType){
        this.description = description;
        this.type = type;
    }

    createCommand(): Command {
        return new Command(`${CLIActionType.BUILD} ${this.type}`)
            .description(this.description)
            .requiredOption("-u, --url <event_url>", "pull request event url")
            .option("-p, --startProject <project>", "The project to start the build from");
    }
}