const glob = require("@actions/glob");
const path = require("path");
const { stat } = require("fs");
const { dirname } = require("path");
const { promisify } = require("util");
const stats = promisify(stat);
const { logger } = require("../common");

async function findFilesToUpload(searchPath, globOptions) {
  const globber = await glob.create(
    searchPath,
    globOptions || getDefaultGlobOptions()
  );
  const filesToUpload = await getSearchResults(globber);

  return {
    filesToUpload,
    rootDirectory: getRootDirectory(globber, filesToUpload)
  };
}

/**
 * If multiple paths are specific, the least common ancestor (LCA) of the search paths is used as
 * the delimiter to control the directory structure for the artifact. This function returns the LCA
 * when given an array of search paths
 *
 * Example 1: The patterns `/foo/` and `/bar/` returns `/`
 *
 * Example 2: The patterns `~/foo/bar/*` and `~/foo/voo/two/*` and `~/foo/mo/` returns `~/foo`
 */
function getMultiPathLCA(searchPaths) {
  if (searchPaths.length < 2) {
    throw new Error("At least two search paths must be provided");
  }

  const commonPaths = [];
  let smallestPathLength = Number.MAX_SAFE_INTEGER;

  const splitPaths = searchPaths
    .map(searchPath => path.normalize(searchPath).split(path.sep))
    .reduce((acc, splitSearchPath) => {
      smallestPathLength = Math.min(smallestPathLength, splitSearchPath.length);
      acc.push(splitSearchPath);
      return acc;
    }, []);

  if (searchPaths[0].startsWith(path.sep)) {
    commonPaths.push(path.sep);
  }

  let splitIndex = 0;
  function isPathTheSame() {
    const compare = splitPaths[0][splitIndex];
    for (let i = 1; i < splitPaths.length; i++) {
      if (compare !== splitPaths[i][splitIndex]) {
        return false;
      }
    }
    return true;
  }

  while (splitIndex < smallestPathLength) {
    if (!isPathTheSame()) {
      break;
    }
    commonPaths.push(splitPaths[0][splitIndex]);
    splitIndex++;
  }
  return path.join(...commonPaths);
}

async function getSearchResults(globber) {
  const rawSearchResults = await globber.glob();

  const searchResults = [];
  for (const searchResult of rawSearchResults) {
    const fileStats = await stats(searchResult);
    if (!fileStats.isDirectory()) {
      searchResults.push(searchResult);
      if (
        searchResults
          .map(item => item.toLowerCase())
          .find(item => item === searchResult.toLowerCase())
      ) {
        logger.info(
          `Uploads are case insensitive: ${searchResult} was detected that it will be overwritten by another file with the same path`
        );
      }
    }
  }
  return searchResults;
}

function getRootDirectory(globber, searchResults) {
  const searchPaths = globber.getSearchPaths();
  if (searchPaths.length > 1) {
    logger.info(
      `Multiple search paths detected. Calculating the least common ancestor of all paths`
    );
    const lcaSearchPath = getMultiPathLCA(searchPaths);
    logger.info(
      `The least common ancestor is ${lcaSearchPath}. This will be the root directory of the artifact`
    );
    return lcaSearchPath;
  }
  return searchResults.length === 1 && searchPaths[0] === searchResults[0]
    ? dirname(searchResults[0])
    : searchPaths[0];
}

function getDefaultGlobOptions() {
  return {
    followSymbolicLinks: true,
    implicitDescendants: true,
    omitBrokenSymbolicLinks: true
  };
}

module.exports = {
  findFilesToUpload
};
