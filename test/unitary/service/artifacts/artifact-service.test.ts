import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { UploadService } from "@bc/service/artifacts/upload-service";
import Container from "typedi";
import { ArtifactService } from "@bc/service/artifacts/artifact-service";
import { Node } from "@kie/build-chain-configuration-reader";

// disable logs
jest.spyOn(global.console, "log");

// just to initialize config service otheriwse not relevant
Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);

const nodeChain: Node[] = [
  {
    project: "owner1/project1",
    parents: [],
    children: [],
    depth: -1,
    archiveArtifacts: {
      name: "artifacts-project1",
      dependencies: "all",
      "if-no-files-found": "ignore",
      paths: [{ path: "test", on: "success" }],
    },
  },
  {
    project: "owner2/project2",
    parents: [],
    children: [],
    depth: -1,
    archiveArtifacts: {
      name: "artifacts-project1",
      dependencies: "none",
      "if-no-files-found": "ignore",
      paths: [{ path: "test", on: "success" }],
    },
  },
  {
    project: "owner3/project3",
    parents: [],
    children: [],
    depth: -1,
    archiveArtifacts: {
      name: "artifacts-project1",
      dependencies: ["owner1/project1"],
      "if-no-files-found": "ignore",
      paths: [{ path: "test", on: "success" }],
    },
  },
];

test.each([
  ["none", 1, [nodeChain[1]]],
  ["all", 0, nodeChain],
  ["array of projects", 2, [nodeChain[0], nodeChain[2]]],
])("artifacts dependencies: %p", async (_title: string, startProjectIndex: number, nodesToArchive: Node[]) => {
  const spyUpload = jest.spyOn(UploadService.prototype, "upload").mockImplementation(async () => {
    return {
      artifactName: "",
      artifactItems: [],
      failedItems: [],
      size: 0,
    };
  });
  const artifactService = Container.get(ArtifactService);
  await artifactService.uploadNodes(nodeChain, nodeChain[startProjectIndex]);
  expect(spyUpload).toHaveBeenCalledTimes(nodesToArchive.length);
  nodesToArchive.forEach(node => {
    expect(spyUpload).toHaveBeenCalledWith(node.archiveArtifacts, node.project);
  });
});
