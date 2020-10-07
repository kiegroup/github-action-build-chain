const http = require("http");
const https = require("https");

function checkUrlExist(url) {
  return new Promise(resolve => {
    (url.startsWith("https://") ? https : http).get(url, response => {
      resolve(200 === response.statusCode);
    });
  });
}

module.exports = {
  checkUrlExist
};
