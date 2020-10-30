const {
  getOrderedListForTree
} = require("@kie/build-chain-configuration-reader");
const { logger } = require("../../src/lib/common");

async function execute(args) {
  if (args.tools === "project-list") {
    logger.info(`Executing project list for ${args.df[0]}`);
    const orderedList = (await getOrderedListForTree(args.df[0])).map(
      e => e.project
    );

    if (args.skipGroup) {
      logger.info(
        "\n" +
          orderedList
            .map(project => (project ? project.split("/")[1] : project))
            .reduce((acc, project) => acc.concat(`${project}\n`), "")
      );
    } else {
      logger.info(
        "\n" +
          orderedList.reduce((acc, project) => acc.concat(`${project}\n`), "")
      );
    }
  }
}

module.exports = { execute };
