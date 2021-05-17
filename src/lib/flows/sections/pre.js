const { readDefinitionFile } = require("@kie/build-chain-configuration-reader");
const { executeBuildCommands } = require("../common/common-helper");
const core = require("@actions/core");

async function execute(
  file,
  options = { urlPlaceHolders: {}, token: undefined }
) {
  const definitionFile = await readDefinitionFile(file, options);
  if (definitionFile.pre) {
    core.startGroup(`[PRE] Executing pre section for ${file}`);
    await executeBuildCommands(
      process.cwd(),
      definitionFile.pre.split(/\r?\n/),
      "PRE",
      {
        skipStartGroup: true
      }
    );
    core.endGroup();
  }
}

module.exports = { execute };
