import * as util from "util";

export class Logger {
  log(prefix: string, ...str: string[]) {
    // eslint-disable-next-line
    console.log.apply(console, [prefix ?? [], ...str]);
  }

  emptyLine() {
    this.log("", "");
  }

  private inspect(obj: unknown) {
    return util.inspect(obj, false, null, true);
  }
}
