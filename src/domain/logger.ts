import * as util from 'util';

export class Logger {
  log(prefix: string, obj: any) {
    const str = obj.map((o: any) => (typeof o === 'object' ? this.inspect(o) : o));
    if (prefix) {
      console.log.apply(console, [prefix, ...str]);
    } else {
      console.log.apply(console, str);
    }
  }

  emptyLine() {
    this.log('', []);
  }

  private inspect(obj: any) {
    return util.inspect(obj, false, null, true);
  }

}
