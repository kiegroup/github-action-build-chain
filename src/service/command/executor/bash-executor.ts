import { exec, ExecOptions } from "@actions/exec";
import { Service } from "typedi";

@Service()
export class BashExecutor {

  async execute(command: string, opts?: ExecOptions): Promise<void> {
    await exec(command, [], opts);
  }
}