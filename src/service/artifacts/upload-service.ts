import { create, GlobOptions } from "@actions/glob";
import path from "path";
import { Service } from "typedi";
import { stat } from "fs";
import { promisify } from "util";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { ArchiveArtifacts } from "@kie/build-chain-configuration-reader";
import { IfNoFile } from "@bc/domain/archive";
import * as artifact from "@actions/artifact";
import { logAndThrow } from "@bc/utils/log";

const stats = promisify(stat);
type SearchResult = { filesToUpload: string[]; rootDirectory: string };

@Service()
export class UploadService {
  private readonly logger: LoggerService;
  constructor() {
    this.logger = LoggerServiceFactory.getInstance();
  }

  /** src: https://github.com/actions/upload-artifact/blob/main/src/search.ts#L31 */
  private getMultiPathLCA(searchPaths: string[]): string {
    if (searchPaths.length < 2) {
      throw new Error("At least two search paths must be provided");
    }

    const commonPaths: string[] = [];
    const splitPaths: string[][] = [];
    let smallestPathLength = Number.MAX_SAFE_INTEGER;

    // split each of the search paths using the platform specific separator
    for (const searchPath of searchPaths) {
      const splitSearchPath = path.normalize(searchPath).split(path.sep);

      // keep track of the smallest path length so that we don't accidentally later go out of bounds
      smallestPathLength = Math.min(smallestPathLength, splitSearchPath.length);
      splitPaths.push(splitSearchPath);
    }

    // on Unix-like file systems, the file separator exists at the beginning of the file path, make sure to preserve it
    if (searchPaths[0].startsWith(path.sep)) {
      commonPaths.push(path.sep);
    }

    // loop over all the search paths until there is a non-common ancestor or we go out of bounds
    for (let splitIndex = 0; splitIndex < smallestPathLength; splitIndex++) {
      let flag = true;
      // check if the paths are the same at a specific index
      for (let i = 1; i < splitPaths.length; i++) {
        if (splitPaths[0][splitIndex] !== splitPaths[i][splitIndex]) {
          // a non-common index has been reached
          flag = false;
          break;
        }
      }
      if (!flag) {
        break;
      }
      // if all are the same, add to the end result & increment the index
      commonPaths.push(splitPaths[0][splitIndex]);
    }

    return path.join(...commonPaths);
  }

  private getRootDir(searchPaths: string[], searchResults: string[]) {
    if (searchPaths.length > 1) {
      this.logger.info("Multiple search paths detected. Calculating the least common ancestor of all paths");
      const lcaSearchPath = this.getMultiPathLCA(searchPaths);
      this.logger.info(`The least common ancestor is ${lcaSearchPath}. This will be the root directory of the artifact`);

      return lcaSearchPath;
    }

    /*
      Special case for a single file artifact that is uploaded without a directory or wildcard pattern. The directory structure is
      not preserved and the root directory will be the single files parent directory
    */
    if (searchResults.length === 1 && searchPaths[0] === searchResults[0]) {
      return path.dirname(searchResults[0]);
    }

    return searchPaths[0];
  }

  private async findFilesToUpload(
    searchPath: string,
    globOptions: GlobOptions = { followSymbolicLinks: true, implicitDescendants: true, omitBrokenSymbolicLinks: true }
  ): Promise<SearchResult> {
    const searchResults: string[] = [];
    const globber = await create(searchPath, globOptions);
    const rawSearchResults: string[] = await globber.glob();

    /*
      Files are saved with case insensitivity. Uploading both a.txt and A.txt will files to be overwritten
      Detect any files that could be overwritten for user awareness
    */
    const set = new Set<string>();

    /*
      Directories will be rejected if attempted to be uploaded. This includes just empty
      directories so filter any directories out from the raw search results
    */
    for (const searchResult of rawSearchResults) {
      const fileStats = await stats(searchResult);
      // isDirectory() returns false for symlinks if using fs.lstat(), make sure to use fs.stat() instead
      if (!fileStats.isDirectory()) {
        searchResults.push(searchResult);

        // detect any files that would be overwritten because of case insensitivity
        if (set.has(searchResult.toLowerCase())) {
          this.logger.info(
            `Uploads are case insensitive: ${searchResult} was detected that it will be overwritten by another file with the same path`
          );
        } else {
          set.add(searchResult.toLowerCase());
        }
      }
    }

    // Calculate the root directory for the artifact using the search paths that were utilized
    const rootDirectory = this.getRootDir(globber.getSearchPaths(), searchResults);

    return {
      filesToUpload: searchResults,
      rootDirectory,
    };
  }

  private noFileFound(archiveArtifacts: ArchiveArtifacts, searchPaths: string) {
    switch (archiveArtifacts["if-no-files-found"]) {
      case IfNoFile.ERROR:
        throw logAndThrow(`No files were found with the provided path: ${searchPaths}. No artifacts will be uploaded.`);
      case IfNoFile.IGNORE:
        this.logger.info(`No files were found with the provided path: ${searchPaths}. No artifacts will be uploaded.`);
        break;
      case IfNoFile.WARN:
      default:
        this.logger.warn(`No files were found with the provided path: ${searchPaths}. No artifacts will be uploaded.`);
    }
  }

  async upload(archiveArtifacts: ArchiveArtifacts): Promise<artifact.UploadResponse> {
    // remove the filter once build-chain-config reader is refactored
    const searchPaths = archiveArtifacts.paths.filter(pathItem => pathItem.path).reduce((prev: string, curr) => prev.concat(curr.path!, "\n"), "");

    const { filesToUpload, rootDirectory } = await this.findFilesToUpload(searchPaths);
    if (filesToUpload.length === 0) {
      this.noFileFound(archiveArtifacts, searchPaths);
      return {
        artifactName: archiveArtifacts.name,
        artifactItems: [],
        failedItems: [],
        size: 0,
      };
    } else {
      this.logger.debug(`With the provided path (${searchPaths}), there will be ${filesToUpload.length} file(s) uploaded`);
      this.logger.debug(`Root artifact directory is ${rootDirectory}`);
      return artifact.create().uploadArtifact(archiveArtifacts.name, filesToUpload, rootDirectory, { continueOnError: false });
    }
  }
}
