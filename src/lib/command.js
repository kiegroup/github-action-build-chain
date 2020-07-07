const { spawn } = require("child_process");

const { logger } = require("./common");

class ExitError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function execute(cwd, command, ...args) {
  const stdio = [
    "ignore",
    "pipe",
    logger.level === "trace" || logger.level === "debug" ? "inherit" : "ignore"
  ];
  // the URL passed to the clone command could contain a password!
  logger.info("Executing", `${command} ${Array.from(...args).join(' ')}`);
  return new Promise((resolve, reject) => {
    const proc = spawn(
      command,
      Array.from(...args),
      { cwd, stdio }
    );
    const buffers = [];
    proc.stdout.on("data", data => buffers.push(data));
    proc.on("error", () => {
      reject(new Error(`command failed: ${command}`));
    });
    proc.on("exit", code => {
      if (code === 0) {
        const data = Buffer.concat(buffers);
        resolve(data.toString("utf8").trim());
      } else {
        const data = Buffer.concat(buffers);
        reject(data.toString("utf8").trim());
      }
    });
  });
}

module.exports = {
  ExitError,
  execute
};
