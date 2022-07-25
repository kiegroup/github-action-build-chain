export type CheckoutInfo = {
  sourceName: string;
  sourceGroup: string;
  sourceBranch: string;
  targetName: string;
  targetGroup: string;
  targetBranch: string;
  merge: boolean;
};

export type CheckedOutNode = {
  project: string;
  checkoutInfo?: CheckoutInfo
}
