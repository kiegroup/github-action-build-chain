const http = require("http");
const https = require("https");

function checkUrlExist(url, token = undefined) {
  const options = token ? { headers: { Authorization: `token ${token}` } } : {};
  return new Promise(resolve => {
    (url.startsWith("https://") ? https : http).get(url, options, response => {
      resolve(200 === response.statusCode);
    });
  });
}

module.exports = {
  checkUrlExist
};
