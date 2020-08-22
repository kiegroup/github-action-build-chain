const { run } = require("../../../src/lib/artifacts/upload-artifacts");

const { warning, setFailed, info } = require("@actions/core");
const { create } = require("@actions/artifact");
const { findFilesToUpload } = require("../../../src/lib/artifacts/search");
jest.mock("../../../src/lib/artifacts/search");
jest.mock("@actions/core");
jest.mock("@actions/artifact");

afterEach(() => {
  jest.clearAllMocks();
});

test("run no files, default", async () => {
  // Arrange
  const archiveArtifacts = {
    name: "whatevername",
    path: "whateverpath"
  };
  findFilesToUpload.mockResolvedValueOnce({ filesToUpload: [] });
  // Act
  const result = await run(archiveArtifacts);

  // Assert
  expect(warning).toHaveBeenCalledTimes(1);
  expect(info).toHaveBeenCalledTimes(0);
  expect(setFailed).toHaveBeenCalledTimes(0);
  expect(create).toHaveBeenCalledTimes(0);
  expect(result).toStrictEqual(undefined);
});

test("run no files, WARNING", async () => {
  // Arrange
  const archiveArtifacts = {
    ifNoFilesFound: "warn",
    name: "whatevername",
    path: "whateverpath"
  };
  findFilesToUpload.mockResolvedValueOnce({ filesToUpload: [] });
  // Act
  const result = await run(archiveArtifacts);

  // Assert
  expect(warning).toHaveBeenCalledTimes(1);
  expect(info).toHaveBeenCalledTimes(0);
  expect(setFailed).toHaveBeenCalledTimes(0);
  expect(create).toHaveBeenCalledTimes(0);
  expect(result).toStrictEqual(undefined);
});

test("run no files, IGNORE", async () => {
  // Arrange
  const archiveArtifacts = {
    ifNoFilesFound: "ignore",
    name: "whatevername",
    path: "whateverpath"
  };
  findFilesToUpload.mockResolvedValueOnce({ filesToUpload: [] });
  // Act
  const result = await run(archiveArtifacts);

  // Assert
  expect(warning).toHaveBeenCalledTimes(0);
  expect(info).toHaveBeenCalledTimes(1);
  expect(setFailed).toHaveBeenCalledTimes(0);
  expect(create).toHaveBeenCalledTimes(0);
  expect(result).toStrictEqual(undefined);
});

test("run no files, ERROR", async () => {
  // Arrange
  const archiveArtifacts = {
    ifNoFilesFound: "error",
    name: "whatevername",
    path: "whateverpath"
  };
  findFilesToUpload.mockResolvedValueOnce({ filesToUpload: [] });
  // Act
  const result = await run(archiveArtifacts);

  // Assert
  expect(warning).toHaveBeenCalledTimes(0);
  expect(info).toHaveBeenCalledTimes(0);
  expect(setFailed).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledTimes(0);
  expect(result).toStrictEqual(undefined);
});

test("run with files no failed Items", async () => {
  // Arrange
  const archiveArtifacts = {
    name: "name",
    path: "whateverpath"
  };

  findFilesToUpload.mockResolvedValueOnce({
    filesToUpload: [{ file: "a" }, { file: "b" }],
    rootDirectory: "folderx"
  });
  const uploadArtifact = jest
    .fn()
    .mockResolvedValue({ failedItems: [], artifactName: "artifactName" });
  create.mockReturnValueOnce({ uploadArtifact });

  // Act
  const result = await run(archiveArtifacts);

  // Assert
  expect(create).toHaveBeenCalledTimes(1);
  expect(uploadArtifact).toHaveBeenCalledTimes(1);
  expect(uploadArtifact).toHaveBeenCalledWith(
    "name",
    [{ file: "a" }, { file: "b" }],
    "folderx",
    {
      continueOnError: false
    }
  );
  expect(info).toHaveBeenCalledWith(
    "[INFO] Artifact artifactName has been successfully uploaded!"
  );
  expect(result.artifactName).toStrictEqual("artifactName");
  expect(result.failedItems).toStrictEqual([]);
});

test("run with files and failed Items", async () => {
  // Arrange
  const archiveArtifacts = {
    name: "name",
    path: "whateverpath"
  };

  findFilesToUpload.mockResolvedValueOnce({
    filesToUpload: [{ file: "a" }, { file: "b" }],
    rootDirectory: "folderx"
  });
  const uploadArtifact = jest
    .fn()
    .mockResolvedValue({ failedItems: [{}, {}], artifactName: "artifactName" });
  create.mockReturnValueOnce({ uploadArtifact });

  // Act
  const result = await run(archiveArtifacts);

  // Assert
  expect(create).toHaveBeenCalledTimes(1);
  expect(uploadArtifact).toHaveBeenCalledTimes(1);
  expect(uploadArtifact).toHaveBeenCalledWith(
    "name",
    [{ file: "a" }, { file: "b" }],
    "folderx",
    {
      continueOnError: false
    }
  );
  expect(setFailed).toHaveBeenCalledWith(
    "[ERROR] An error was encountered when uploading artifactName. There were 2 items that failed to upload."
  );
  expect(result.artifactName).toStrictEqual("artifactName");
  expect(result.failedItems).toStrictEqual([{}, {}]);
});
