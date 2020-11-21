require("dotenv").config();

async function execute(cwd, command) {
  process.env["KIE_VERSION"] = "NEW_VERSION";
  // const options = {};
  // options.cwd = cwd;
  // await exec.exec(command, [], options);
  console.log(cwd, command);
}

module.exports = {
  execute
};
