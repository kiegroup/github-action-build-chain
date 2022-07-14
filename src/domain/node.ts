import { Commands } from "@bc/domain/commands";
import { Mapping } from "@kie/build-chain-configuration-reader";

// TODO: fill the rest of attributes
export interface Node {
  project: string;
  parents?: Node[];
  children?: Node[];
  dependencies?: Node[];
  before?: Commands;
  commands?: Commands;
  after?: Commands;
  mapping?: Mapping;
}

export const defaultValue: Readonly<Node> = {
  project: "",
};
