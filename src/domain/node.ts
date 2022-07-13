import { Commands } from "@bc/domain/commands";

// TODO: fill the rest of attributes
export interface Node {
  project: string;
  parents?: Node[];
  children?: Node[];
  dependencies?: Node[];
  before?: Commands;
  commands?: Commands;
  after?: Commands;
}

export const defaultValue: Readonly<Node> = {
  project: "",
};
