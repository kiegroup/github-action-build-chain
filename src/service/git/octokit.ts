import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { Octokit } from "@octokit/rest";
import Container from "typedi";

/**
 * Singleton factory for octokit instance
 */
export class OctokitFactory {
    private static octokit: Octokit;

    /**
     * Get the initialized octokit instance and initialize it if not done yet.
     * During initialization, add token to the octokit instance if it is being used 
     * in a Github runner env
     * @returns {Octokit} a hydrated octokit instance
     */
    public static getOctokitInstance(): Octokit {
        if (!this.octokit) {
            const entryPoint: EntryPoint = Container.get(constants.CONTAINER.ENTRY_POINT);
            switch (entryPoint) {
                case EntryPoint.CLI:
                    this.octokit = new Octokit({
                        userAgent: "kiegroup/github-build-chain-action"
                    });
                    break;
                case EntryPoint.GITHUB_EVENT:
                    this.octokit =  new Octokit({
                        auth: Container.get(constants.GITHUB.TOKEN),
                        userAgent: "kiegroup/github-build-chain-action"
                    });
                    break;
                default:
                    throw new Error(`No LoggerService defined for ${entryPoint}`);
            }
        }
        return this.octokit;
    }
}