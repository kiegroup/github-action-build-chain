import "reflect-metadata";
import path from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { ArchiveArtifacts, IfNoFile } from "@kie/build-chain-configuration-reader";
import { UploadService } from "@bc/service/artifacts/upload-service";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { create } from "@actions/artifact";
import * as core from "@actions/core";
import { AbstractLoggerService } from "@bc/service/logger/abstract-logger-service";

jest.mock("@actions/artifact");

// disable logs
jest.spyOn(global.console, "log");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
let uploadService: UploadService;
const mockedCreate = create as jest.Mock;
const uploadOptions = { continueOnError: false };

const constructArchiveArtifacts = (search: string[], ifNoFilesFound: IfNoFile = "ignore" as IfNoFile): ArchiveArtifacts => {
  return {
    "if-no-files-found": ifNoFilesFound,
    dependencies: "all",
    name: "test",
    paths: search.map(s => {
      return { path: s, on: "success" };
    }),
  };
};

beforeEach(() => {
  uploadService = Container.get(UploadService);
  jest.spyOn(core, "debug").mockImplementation(() => undefined);
  jest.spyOn(core, "info").mockImplementation(() => undefined);
  jest.spyOn(core, "warning").mockImplementation(() => undefined);
});

describe("search files", () => {
  const root = path.join(__dirname, "_temp");
  const searchItem1Path = path.join(root, "folder-a", "folder-b", "folder-c", "search-item1.txt");
  const searchItem2Path = path.join(root, "folder-d", "search-item2.txt");
  const searchItem3Path = path.join(root, "folder-d", "search-item3.txt");
  const searchItem4Path = path.join(root, "folder-d", "search-item4.txt");
  const searchItem5Path = path.join(root, "search-item5.txt");
  const extraSearchItem1Path = path.join(root, "folder-a", "folder-b", "folder-c", "extraSearch-item1.txt");
  const extraSearchItem2Path = path.join(root, "folder-d", "extraSearch-item2.txt");
  const extraSearchItem3Path = path.join(root, "folder-f", "extraSearch-item3.txt");
  const extraSearchItem4Path = path.join(root, "folder-h", "folder-i", "extraSearch-item4.txt");
  const extraSearchItem5Path = path.join(root, "folder-h", "folder-i", "extraSearch-item5.txt");
  const extraFileInFolderCPath = path.join(root, "folder-a", "folder-b", "folder-c", "extra-file-in-folder-c.txt");
  const amazingFileInFolderHPath = path.join(root, "folder-h", "amazing-item.txt");
  const lonelyFilePath = path.join(root, "folder-h", "folder-j", "folder-k", "lonely-file.txt");
  beforeEach(async () => {
    await mkdir(path.dirname(searchItem1Path), {
      recursive: true,
    });
    await mkdir(path.join(root, "folder-a", "folder-b", "folder-e"), {
      recursive: true,
    });
    await mkdir(path.dirname(searchItem2Path), {
      recursive: true,
    });
    await mkdir(path.dirname(extraSearchItem3Path), {
      recursive: true,
    });
    await mkdir(path.join(root, "folder-g"), {
      recursive: true,
    });
    await mkdir(path.dirname(extraSearchItem4Path), {
      recursive: true,
    });
    await mkdir(path.dirname(lonelyFilePath), {
      recursive: true,
    });
    await Promise.all([
      writeFile(searchItem1Path, "search item1 file"),
      writeFile(searchItem2Path, "search item2 file"),
      writeFile(searchItem3Path, "search item3 file"),
      writeFile(searchItem4Path, "search item4 file"),
      writeFile(searchItem5Path, "search item5 file"),
      writeFile(extraSearchItem1Path, "extraSearch item1 file"),
      writeFile(extraSearchItem2Path, "extraSearch item2 file"),
      writeFile(extraSearchItem3Path, "extraSearch item3 file"),
      writeFile(extraSearchItem4Path, "extraSearch item4 file"),
      writeFile(extraSearchItem5Path, "extraSearch item5 file"),
      writeFile(extraFileInFolderCPath, "extra file"),
      writeFile(amazingFileInFolderHPath, "amazing file"),
      writeFile(lonelyFilePath, "all by itself"),
    ]);
  });

  afterEach(async () => {
    await rm(root, { recursive: true });
  });

  test.each([
    ["Absolute Path", searchItem1Path],
    ["Relative Path", path.join("test", "unitary", "service", "artifacts", "_temp", "folder-a", "folder-b", "folder-c", "search-item1.txt")],
  ])("Single file search -  %p", async (_title: string, searchPath: string) => {
    const rootDir = path.join(root, "folder-a", "folder-b", "folder-c");
    const archiveConfig = constructArchiveArtifacts([searchPath]);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalledWith(archiveConfig.name, [searchItem1Path], rootDir, uploadOptions);
  });

  test("Single file using wildcard", async () => {
    const searchPath = path.join(root, "folder-h", "**/*lonely*");
    const rootDir = path.join(root, "folder-h");
    const archiveConfig = constructArchiveArtifacts([searchPath]);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalledWith(archiveConfig.name, [lonelyFilePath], rootDir, uploadOptions);
  });

  test("Single file using directory", async () => {
    const searchPath = path.join(root, "folder-h", "folder-j");
    const archiveConfig = constructArchiveArtifacts([searchPath]);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalledWith(archiveConfig.name, [lonelyFilePath], searchPath, uploadOptions);
  });

  test.each([
    ["Absolute Path", path.join(root, "folder-h"), path.join(root, "folder-h")],
    ["Relative Path", path.join("test", "unitary", "service", "artifacts", "_temp", "folder-h"), path.join(root, "folder-h")],
  ])("Directory search - %p", async (_title: string, searchPath: string, rootDir: string) => {
    const archiveConfig = constructArchiveArtifacts([searchPath]);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    const filesToUpload = [amazingFileInFolderHPath, extraSearchItem4Path, extraSearchItem5Path, lonelyFilePath];
    expect(uploadArtifact).toHaveBeenCalled();
    const receivedName = uploadArtifact.mock.calls[0][0];
    const receivedFiles = uploadArtifact.mock.calls[0][1];
    const receivedRoot = uploadArtifact.mock.calls[0][2];
    const receivedOptions = uploadArtifact.mock.calls[0][3];
    expect(receivedName).toBe(archiveConfig.name);
    expect(receivedFiles.sort()).toStrictEqual(filesToUpload.sort());
    expect(receivedRoot).toBe(rootDir);
    expect(receivedOptions).toStrictEqual(uploadOptions);
  });

  test.each([
    ["Absolute Path", path.join(root, "**/*[Ss]earch*")],
    ["Relative Path", path.join("test", "unitary", "service", "artifacts", "_temp", "**/*[Ss]earch*")],
  ])("Wildcard search - %p", async (_title: string, searchPath) => {
    const archiveConfig = constructArchiveArtifacts([searchPath]);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalled();
    const receivedName = uploadArtifact.mock.calls[0][0];
    const receivedFiles = uploadArtifact.mock.calls[0][1];
    const receivedRoot = uploadArtifact.mock.calls[0][2];
    const receivedOptions = uploadArtifact.mock.calls[0][3];
    const filesToUpload = [
      searchItem1Path,
      searchItem2Path,
      searchItem3Path,
      searchItem4Path,
      searchItem5Path,
      extraSearchItem1Path,
      extraSearchItem2Path,
      extraSearchItem3Path,
      extraSearchItem4Path,
      extraSearchItem5Path,
    ];
    expect(receivedName).toBe(archiveConfig.name);
    expect(receivedFiles.sort()).toStrictEqual(filesToUpload.sort());
    expect(receivedRoot).toBe(root);
    expect(receivedOptions).toStrictEqual(uploadOptions);
  });

  test("Multi path search - root directory", async () => {
    const searchPath = [path.join(root, "folder-a"), path.join(root, "folder-d")];
    const archiveConfig = constructArchiveArtifacts(searchPath);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalled();
    const receivedName = uploadArtifact.mock.calls[0][0];
    const receivedFiles = uploadArtifact.mock.calls[0][1];
    const receivedRoot = uploadArtifact.mock.calls[0][2];
    const receivedOptions = uploadArtifact.mock.calls[0][3];
    const filesToUpload = [
      searchItem1Path,
      searchItem2Path,
      searchItem3Path,
      searchItem4Path,
      extraSearchItem1Path,
      extraSearchItem2Path,
      extraFileInFolderCPath,
    ];
    expect(receivedName).toBe(archiveConfig.name);
    expect(receivedFiles.sort()).toStrictEqual(filesToUpload.sort());
    expect(receivedRoot).toBe(root);
    expect(receivedOptions).toStrictEqual(uploadOptions);
  });

  test("Multi path search - with exclude character", async () => {
    const searchPath = [path.join(root, "folder-a"), path.join(root, "folder-d"), "!" + path.join(root, "folder-a", "folder-b", "**/extra*.txt")];
    const archiveConfig = constructArchiveArtifacts(searchPath);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalled();
    const receivedName = uploadArtifact.mock.calls[0][0];
    const receivedFiles = uploadArtifact.mock.calls[0][1];
    const receivedRoot = uploadArtifact.mock.calls[0][2];
    const receivedOptions = uploadArtifact.mock.calls[0][3];
    const filesToUpload = [searchItem1Path, searchItem2Path, searchItem3Path, searchItem4Path, extraSearchItem2Path];
    expect(receivedName).toBe(archiveConfig.name);
    expect(receivedFiles.sort()).toStrictEqual(filesToUpload.sort());
    expect(receivedRoot).toBe(root);
    expect(receivedOptions).toStrictEqual(uploadOptions);
  });

  test("Multi path search - non root directory", async () => {
    const searchPath = [path.join(root, "folder-h", "folder-i"), path.join(root, "folder-h", "folder-j", "folder-k"), amazingFileInFolderHPath];
    const archiveConfig = constructArchiveArtifacts(searchPath);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    await uploadService.upload(archiveConfig, "project");
    expect(uploadArtifact).toHaveBeenCalled();
    const receivedName = uploadArtifact.mock.calls[0][0];
    const receivedFiles = uploadArtifact.mock.calls[0][1];
    const receivedRoot = uploadArtifact.mock.calls[0][2];
    const receivedOptions = uploadArtifact.mock.calls[0][3];
    const filesToUpload = [amazingFileInFolderHPath, extraSearchItem4Path, extraSearchItem5Path, lonelyFilePath];
    expect(receivedName).toBe(archiveConfig.name);
    expect(receivedFiles.sort()).toStrictEqual(filesToUpload.sort());
    expect(receivedRoot).toBe(path.join(root, "folder-h"));
    expect(receivedOptions).toStrictEqual(uploadOptions);
  });
});

describe("upload", () => {
  test.each([
    ["default", jest.spyOn(AbstractLoggerService.prototype, "warn")],
    ["warn", jest.spyOn(AbstractLoggerService.prototype, "warn")],
    ["ignore", jest.spyOn(AbstractLoggerService.prototype, "info")],
    ["error", jest.spyOn(AbstractLoggerService.prototype, "error")],
  ])("with no files found - %p", async (ifNoFilesFound: string, spy: jest.SpyInstance) => {
    const archiveConfig = constructArchiveArtifacts([path.join(__dirname, "does-not-exist.txt")], ifNoFilesFound as IfNoFile);
    const uploadArtifact = jest.fn().mockResolvedValue({ failedItems: [], artifactName: archiveConfig.name });
    mockedCreate.mockReturnValueOnce({ uploadArtifact });
    if (ifNoFilesFound === "error") {
      await expect(uploadService.upload(archiveConfig, "project")).rejects.toThrowError();
    } else {
      await expect(uploadService.upload(archiveConfig, "project")).resolves.toStrictEqual({
        artifactName: archiveConfig.name,
        artifactItems: [],
        failedItems: [],
        size: 0,
      });
    }
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
