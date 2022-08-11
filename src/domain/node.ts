import { Commands } from "@bc/domain/commands";
import { ArchiveArtifacts, Mapping } from "@kie/build-chain-configuration-reader";

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
  archiveArtifacts?: ArchiveArtifacts;
}

export const defaultValue: Readonly<Node> = {
  project: "",
};
