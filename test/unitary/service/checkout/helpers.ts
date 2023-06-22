import path from "path";
import { mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { Node } from "@kie/build-chain-configuration-reader";
import { defaultNodeValue } from "@bc/domain/node";

export const nodeChain: Node[] = [
  {
    ...defaultNodeValue,
    project: "owner1/project1",
    clone: ["clone-1", "clone-2"],
    mapping: {
      dependant: {
        default: []
      },
      dependencies: {
        default: []
      },
      exclude: []
    },
  },
  {
    ...defaultNodeValue,
    project: "owner2/project2",
    mapping: {
      exclude: [],
      dependant: {
        default: []
      },
      dependencies: {
        default: [
          {
            source: "tbranch2",
            target: "main",
          },
        ],
        "owner1/project1": [
          {
            source: "tbranch2",
            target: "tbranch1",
          },
        ],
      },
    },
  },
  {
    ...defaultNodeValue,
    project: "owner3/project3",
  },
];

export const serverUrl = "https://github.com";
export const filename = "test.txt";
export const depth1Dir = "depth1";
export const depth2Dir = "depth2";
export const filedata = "test";
export const clones = ["clone-1", "clone-2"];

export const fakeClone = async (to: string) => {
  mkdirSync(path.join(to, depth1Dir, depth2Dir), { recursive: true });
  await Promise.all([
    writeFile(path.join(to, filename), filedata),
    writeFile(path.join(to, depth1Dir, depth2Dir, filename), filedata),
    writeFile(path.join(to, depth1Dir, filename), filedata),
  ]);
};

export const checkClone = async (rootFolder: string) => {
  const promises: Promise<void>[] = [];
  clones.forEach(clone => {
    const fullClonePath = path.join(rootFolder, "owner1_project1", clone);
    promises.push(
      expect(readFile(path.join(fullClonePath, filename), "utf8")).resolves.toBe(filedata),
      expect(readFile(path.join(fullClonePath, depth1Dir, filename), "utf8")).resolves.toBe(filedata),
      expect(readFile(path.join(fullClonePath, depth1Dir, depth2Dir, filename), "utf8")).resolves.toBe(filedata)
    );
  });
  await Promise.all(promises);
};
