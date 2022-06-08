const { copyNodeFolder } = require("../../../src/lib/util/fs-util");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "_temp", "fs-util");

beforeAll(async () => {
  // clear temp directory
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(root, "folder-a", "folder-b", "folder-c1"), {
    recursive: true
  });

  fs.mkdirSync(path.join(root, "folder-a", "folder-b", "folder-c2"), {
    recursive: true
  });

  fs.writeFileSync(
    path.join(root, "folder-a", "folder-b", "folder-c1", "filec1.txt"),
    "file1 content"
  );
  fs.writeFileSync(
    path.join(root, "folder-a", "folder-b", "folder-c2", "filec2.txt"),
    "file2 content"
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

test("copyNodeFolder undefined", async () => {
  // Act
  const result = copyNodeFolder(root, path.join(root, "folder-a"), undefined);
  // Assert
  expect(result).toBe(undefined);
});

test("copyNodeFolder string", async () => {
  // Act
  const result = copyNodeFolder(
    path.join(root),
    path.join(root, "folder-a"),
    "folder-a-cloned1"
  );
  // Assert
  expect(result).toStrictEqual([
    path.join(root, "folder-a", "folder-a-cloned1")
  ]);
  fs.existsSync(path.join(root, "folder-a", "folder-a-cloned1"));
});

test("copyNodeFolder array", async () => {
  // Act
  const result = copyNodeFolder(path.join(root), path.join(root, "folder-a"), [
    "folder-a-cloned-array-1",
    "folder-a-cloned-array-2"
  ]);
  // Assert
  expect(result).toStrictEqual([
    path.join(root, "folder-a", "folder-a-cloned-array-1"),
    path.join(root, "folder-a", "folder-a-cloned-array-2")
  ]);
  fs.existsSync(path.join(root, "folder-a", "folder-a-cloned-array-1"));
  fs.existsSync(path.join(root, "folder-a", "folder-a-cloned-array-2"));
});

test("copyNodeFolder string", async () => {
  // Act
  const result = copyNodeFolder(
    path.join(root),
    path.join(root, "folder-a"),
    "subfolder/folder-a-cloned1"
  );
  // Assert
  expect(result).toStrictEqual([
    path.join(root, "folder-a", "subfolder", "folder-a-cloned1")
  ]);
  fs.existsSync(path.join(root, "folder-a", "subfolder", "folder-a-cloned1"));
});

test("copyNodeFolder array already existing folder", async () => {
  try {
    copyNodeFolder(path.join(root), path.join(root, "folder-a"), "folder-b");
  } catch (ex) {
    expect(ex.message).toBe(
      `Error moving project folder from  ${path.join(
        root
      )}/folder-b to ${path.join(
        root
      )}/folder-a/folder-b. Message: Error: dest already exists.`
    );
    !fs.existsSync(path.join(root, "folder-a", "folder-b"));
  }
});
