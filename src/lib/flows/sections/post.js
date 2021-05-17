const { readDefinitionFile } = require("@kie/build-chain-configuration-reader");
const { logger } = require("../../common");

const { executeBuildCommands } = require("../common/common-helper");
const core = require("@actions/core");

async function execute(
  file,
  executionSuccess,
  options = { urlPlaceHolders: {}, token: undefined }
) {
  const definitionFile = await readDefinitionFile(file, options);
  if (definitionFile.post) {
    core.startGroup(`[POST] Executing post section for ${file}`);
    if (executionSuccess === true) {
      logger.info(
        "[POST] execution result is OK, so 'success' and 'always' sections will be executed"
      );

      if (definitionFile.post.success) {
        await executeBuildCommands(
          process.cwd(),
          definitionFile.post.success.split(/\r?\n/),
          "POST SUCCESS",
          {
            skipStartGroup: true
          }
        );
      }
    } else {
      logger.info(
        "[POST] execution result is NOT OK, so 'failure' and 'always' sections will be executed"
      );

      if (definitionFile.post.failure) {
        await executeBuildCommands(
          process.cwd(),
          definitionFile.post.failure.split(/\r?\n/),
          "POST FAILURE",
          {
            skipStartGroup: true
          }
        );
      }
    }

    if (definitionFile.post.always) {
      await executeBuildCommands(
        process.cwd(),
        definitionFile.post.always.split(/\r?\n/),
        "POST ALWAYS",
        {
          skipStartGroup: true
        }
      );
    }
    core.endGroup();
  }
}

module.exports = { execute };
