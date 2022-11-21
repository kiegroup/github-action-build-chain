import { Node } from "@kie/build-chain-configuration-reader";

export enum NodeExecutionLevel {
  UPSTREAM = "upstream",
  CURRENT = "current",
  DOWNSTREAM = "downstream",
}

export type NodeExecution = {
  node: Node,
  cwd?: string
}