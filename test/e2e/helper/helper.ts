import path from "path";

export const logActOutput = (logFile: string) =>
  process.env.ACT_LOG ? { logFile: path.join(__dirname, logFile) } : {};
