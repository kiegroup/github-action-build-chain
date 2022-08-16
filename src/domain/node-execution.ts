import { Node } from "@bc/domain/node";

export enum NodeExecutionLevel {
  UPSTREAM = "upstream",
  CURRENT = "current",
  DOWNSTREAM = "downstream",
}

export type NodeExecution = {
  node: Node,
  cwd?: string
}