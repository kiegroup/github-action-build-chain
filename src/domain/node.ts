import { Node } from "@kie/build-chain-configuration-reader";

export const defaultNodeValue: Readonly<Node> = {
  project: "",
  parents: [],
  children: [],
  depth: -1
};
