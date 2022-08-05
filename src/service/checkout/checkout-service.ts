import { Node } from "@bc/domain/node";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { getBaseBranch } from "@kie/build-chain-configuration-reader";
import Container, { Service } from "typedi";
import { copy } from "fs-extra";
import path from "path";
import { CheckedOutNode, CheckoutInfo } from "@bc/domain/checkout";
import { GithubAPIService } from "@bc/service/git/github-api";
import { GitCLIService } from "@bc/service/git/git-cli";
import { logAndThrow } from "@bc/utils/log";
import { NotFoundError } from "@bc/domain/errors";

@Service()
export class CheckoutService {
  private readonly config: ConfigurationService;
  private readonly logger: LoggerService;

  constructor() {
    this.config = Container.get(ConfigurationService);
    this.logger = LoggerServiceFactory.getInstance();
  }
  /**
   * A node is cloned into a directory which is named as following:
   * node.project = "owner/project 2"
   * cloned dir = owner_project_2
   * @param node
   * @returns name of the directory in which the node was cloned
   */
  private getProjectDir(node: Node): string {
    return path.join(this.config.getRootFolder(), node.project.replace(/[/\s]/g, "_"));
  }

  /**
   * Implement the 'clone' field functionality
   * Clone the project in multiple folders specified in the clone field
   * Prerequiste: the project must have already been cloned once
   * @param node
   * @returns
   */
  private async cloneNode(node: Node): Promise<void> {
    const promises: Promise<void>[] = [];
    node.clone?.forEach((folder) => {
      promises.push(copy(this.getProjectDir(node), path.join(this.config.getRootFolder(), folder)));
    });
    await Promise.all(promises);
  }

  /**
   * Check out the given node. Checking out involves the following
   * 1. Skip checkout of the node if specified in the corresponding flags
   *  OR
   * 1. Get the checkout info
   * 2. Clone the target repository:branch
   * 3. Merge the source repository:branch into target repository:branch ONLY if merge was true in checkout info
   * 4. Clone (Copy) the target repository multiple times depending on the 'clone' field of the definition file
   * @param node
   * @returns checkout info for the node
   */
  private async checkoutNode(node: Node): Promise<undefined | CheckoutInfo> {
    // Don't checkout this node if skipCheckout flag is set to true or project is listed in skipProjectCheckout flag
    if (this.config.skipCheckout(node)) {
      this.logger.info(`[${node.project}] Checkout skipped`);
      return undefined;
    }

    const checkoutInfo = await this.getCheckoutInfo(node);
    const gitCLIService = Container.get(GitCLIService);

    // get the url of the target repository that needs to be cloned
    const targetCloneUrl = this.config.getCloneUrl(checkoutInfo.targetGroup, checkoutInfo.targetName);

    this.logger.info(`Checking out ${checkoutInfo.targetGroup}/${checkoutInfo.targetName}:${checkoutInfo.targetBranch} into ${checkoutInfo.repoDir}`);

    // clone the repository and switch to target branch (for branch flow target and source branch are the same)
    await gitCLIService.clone(targetCloneUrl, checkoutInfo.repoDir, checkoutInfo.targetBranch).catch(() => {
      logAndThrow(
        `[${node.project}] Error cloning ${checkoutInfo.targetGroup}/${checkoutInfo.targetName} and switching to target branch ${checkoutInfo.targetBranch}`
      );
    });
    if (checkoutInfo.merge) {
      this.logger.info(`[${node.project}] Merging ${checkoutInfo.sourceGroup}/${checkoutInfo.sourceName}:${checkoutInfo.sourceBranch}
      into ${checkoutInfo.targetGroup}/${checkoutInfo.targetName}:${checkoutInfo.targetBranch}`);

      // get url of the source for the merge
      const sourceCloneUrl = this.config.getCloneUrl(checkoutInfo.sourceGroup, checkoutInfo.sourceName);

      await gitCLIService.merge(checkoutInfo.repoDir, sourceCloneUrl, checkoutInfo.sourceBranch).catch(() => {
        logAndThrow(`[${node.project}] Error merging ${checkoutInfo.sourceGroup}/${checkoutInfo.sourceName}:${checkoutInfo.sourceBranch}
                      into ${checkoutInfo.targetGroup}/${checkoutInfo.targetName}:${checkoutInfo.targetBranch}`);
      });
    }
    // clone multiple times if needed
    await this.cloneNode(node);

    this.logger.info(`[${node.project}] Checked out`);

    return checkoutInfo;
  }

  /**
   * Produces the checkout information for the given node
   * Checkout information contains details about the source repository, target repository and whether source needs to be merged into target
   * @param node
   * @returns checkout info
   */
  private async getCheckoutInfo(node: Node): Promise<CheckoutInfo> {
    const githubAPIService = Container.get(GithubAPIService);
    const starterNode = this.config.getStarterNode();
    const originalTarget = this.config.getTargetProject();
    // the current node is the current target
    const currentTarget = {
      // map the starting project target branch to the corresponding branch defined in the mapping for the current node
      // target branch is guaranteed to exist since base always exist
      mappedBranch: getBaseBranch(starterNode.project, starterNode.mapping, node.project, node.mapping, originalTarget.branch!),
      name: node.project.split("/")[1],
      group: node.project.split("/")[0],
    };

    const originalSource = this.config.getSourceProject();

    /**
     * Case 1:
     * Check whether PR exists from node_forked:source_branch to node:mapped_branch
     * (where node_forked is the fork of node owned by the same author as the source's author)
     * Branch existance is automatically checked by hasPullRequest. If the branch does not exist => there is no PR
     */
    const result = await githubAPIService
      .getForkName(currentTarget.group, originalSource.group!, currentTarget.name)
      .then(async (forkName) => {
        // only check for PR if we were able to get a fork name
        const hasPullRequestFromFork = await githubAPIService.hasPullRequest(
          currentTarget.group,
          currentTarget.name,
          `${originalSource.group}/${forkName}:${originalSource.branch}`,
          currentTarget.mappedBranch
        );
        return { forkName, hasPullRequest: hasPullRequestFromFork };
      })
      .catch((err) => {
        if (err instanceof NotFoundError) {
          return { forkName: "", hasPullRequest: false };
        }
        throw err;
      });
    if (result.hasPullRequest) {
      return {
        // source branch is guaranteed to exist since there is PR from the source branch and group
        sourceBranch: originalSource.branch!,
        sourceGroup: originalSource.group!,
        sourceName: result.forkName,
        targetBranch: currentTarget.mappedBranch,
        targetGroup: currentTarget.group,
        targetName: currentTarget.name,
        repoDir: this.getProjectDir(node),
        merge: true,
      };
    }

    /**
     * Case 2:
     * Check whether PR exists from node:source_branch to node:mapped_branch
     * Branch existance is automatically checked by hasPullRequest. If the branch does not exist => there is no PR
     */
    const hasPullRequest = await githubAPIService.hasPullRequest(
      currentTarget.group,
      currentTarget.name,
      `${currentTarget.group}:${originalSource.branch}`,
      currentTarget.mappedBranch
    );
    if (hasPullRequest) {
      return {
        // source branch is guaranteed to exist since there is PR from the source branch
        sourceBranch: originalSource.branch!,
        sourceGroup: currentTarget.group,
        sourceName: currentTarget.name,
        targetBranch: currentTarget.mappedBranch,
        targetGroup: currentTarget.group,
        targetName: currentTarget.name,
        repoDir: this.getProjectDir(node),
        merge: true,
      };
    }

    /**
     * Case 3:
     * No PR available. Checkout node:mapped_branch
     * No need to check for branch existance since when this node is tried to clone, it will error out
     * if the branch does not exist
     */
    return {
      sourceBranch: currentTarget.mappedBranch,
      sourceGroup: currentTarget.group,
      sourceName: currentTarget.name,
      targetBranch: currentTarget.mappedBranch,
      targetGroup: currentTarget.group,
      targetName: currentTarget.name,
      repoDir: this.getProjectDir(node),
      merge: false,
    };
  }

  /**
   * Checkout each node in the node chain sequentially
   * @param nodeChain
   * @returns checkout information for each node
   */
  private async checkoutDefinitionTreeSequential(nodeChain: Node[]): Promise<CheckedOutNode[]> {
    const result: CheckedOutNode[] = [];
    for (const node of nodeChain) {
      const checkoutInfo = await this.checkoutNode(node);
      result.push({
        project: node.project,
        checkoutInfo,
      });
    }
    return result;
  }

  /**
   * Technically this method is concurrent and not parallel since promises are executed concurrently in a single thread js runtime.
   * Although for our use case promises might be better since checkoutNode is a more I/O intensive task (cloning repo, copying dirs etc)
   * Something to explore later would be to compare the performance of this method against one which uses worker threads.
   */
  /**
   * Checkout each node in the node chain parallely
   * @param nodeChain
   * @returns checkout information for each node
   */
  private async checkoutDefinitionTreeParallel(nodeChain: Node[]): Promise<CheckedOutNode[]> {
    return Promise.all(
      nodeChain.map(async (node) => {
        return this.checkoutNode(node).then((checkoutInfo) => {
          return {
            project: node.project,
            checkoutInfo,
          };
        });
      })
    );
  }

  /**
   * Checkout each node in the node chain either parallely or sequentially depending on the skipParallelCheckout flag
   * @param nodeChain
   * @returns checkout information for each node
   */
  async checkoutDefinitionTree(nodeChain: Node[]): Promise<CheckedOutNode[]> {
    return this.config.skipParallelCheckout() ? 
            this.checkoutDefinitionTreeSequential(nodeChain) : 
            this.checkoutDefinitionTreeParallel(nodeChain);
  }
}
