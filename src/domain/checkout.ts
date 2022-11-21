import { Node } from "@kie/build-chain-configuration-reader";

export type CheckoutInfo = {
  sourceName: string;
  sourceGroup: string;
  sourceBranch: string;
  targetName: string;
  targetGroup: string;
  targetBranch: string;
  repoDir: string;
  merge: boolean;
};

export type CheckedOutNode = {
  node: Node;
  checkoutInfo?: CheckoutInfo
}
