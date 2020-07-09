const fse = require("fs-extra");
const fs = require('fs');

const tmp = require("tmp");
const yaml = require('js-yaml');
const { logger } = require("./common");


function tmpdir(callback) {
  async function handle(path) {
    try {
      return await callback(path);
    } finally {
      await fse.remove(path);
    }
  }
  return new Promise((resolve, reject) => {
    tmp.dir((err, path) => {
      if (err) {
        reject(err);
      } else {
        handle(path).then(resolve, reject);
      }
    });
  });
}

function getYamlFileContent(filePath) {
  try {
    let fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.safeLoad(fileContents);
  } catch (e) {
    logger.error(`error reading yaml file ${filePath}`, e);
    throw e;
  }
}



module.exports = {
  tmpdir,
  getYamlFileContent
};
