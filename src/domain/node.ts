import { Commands } from "@bc/domain/commands";
import { Mapping } from "@kie/build-chain-configuration-reader";

export interface Node {
  project: string;
  parents?: Node[];
  children?: Node[];
  dependencies?: Node[];
  before?: Commands;
  commands?: Commands;
  after?: Commands;
  mapping?: Mapping;
  clone?: string[];
}

export const defaultValue: Readonly<Node> = {
  project: "",
};
