const util = require("util");
const process = require("process");

class ClientError extends Error {}

class TimeoutError extends Error {}

function log(prefix, obj) {
  if (process.env.NODE_ENV !== "test") {
    const str = obj.map(o => (typeof o === "object" ? inspect(o) : o));
    if (prefix) {
      console.log.apply(console, [prefix, ...str]);
    } else {
      console.log.apply(console, str);
    }
  }
}

const logger = {
  level: "info",

  trace: (...str) => {
    if (logger.level === "trace") {
      log("[TRACE]", str);
    }
  },

  debug: (...str) => {
    if (logger.level === "trace" || logger.level === "debug") {
      log("DEBUG", str);
    }
  },

  info: (...str) => log("[INFO] ", str),
  warn: (...str) => log("[WARN] ", str),

  error: (...str) => {
    if (str.length === 1) {
      if (str[0] instanceof Error) {
        if (logger.level === "trace" || logger.level === "debug") {
          log(null, [str[0].stack || str[0]]);
        } else {
          log("[ERROR] ", [str[0].message || str[0]]);
        }
      }
    } else {
      log("[ERROR] ", str);
    }
  }
};

function inspect(obj) {
  return util.inspect(obj, false, null, true);
}

function dependenciesToObject(dependencies, defaultGroup) {
  const dependenciesObject = {};
  dependencies
    ? dependencies
        .split("\n")
        .filter(line => line)
        .forEach(item => {
          const dependency = item.trim().includes("@")
            ? item.trim().split("@")
            : [item, undefined];
          const groupProject = dependency[0].includes("/")
            ? dependency[0].trim().split("/")
            : [defaultGroup, dependency[0]];

          dependency[1]
            ? (dependenciesObject[groupProject[1].trim()] = {
                group: groupProject[0],
                mapping: {
                  source: dependency[1].split(":")[0],
                  target: dependency[1].split(":")[1]
                }
              })
            : (dependenciesObject[groupProject[1].trim()] = {
                group: groupProject[0]
              });
        })
    : {};
  return dependenciesObject;
}

module.exports = {
  ClientError,
  TimeoutError,
  logger,
  dependenciesToObject
};
