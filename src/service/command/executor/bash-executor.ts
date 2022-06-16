import { exec } from "@actions/exec";
import { Service } from "typedi";

@Service()
export class BashExecutor {

  async execute(command: string, cwd?: string): Promise<void> {
    await exec(command, [], { cwd });
  }
}