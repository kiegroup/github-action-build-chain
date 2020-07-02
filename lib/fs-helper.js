const fse = require("fs-extra");
const tmp = require("tmp");

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

module.exports = {
  tmpdir
};
