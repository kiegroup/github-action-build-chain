#!/usr/bin/env node

import "reflect-metadata";
import { Runner } from "@bc/bin/runners/runner";
import { EntryPoint } from "@bc/domain/entry-point";

export class CLIRunner extends Runner {
  constructor() {
    super(EntryPoint.CLI);
  }

  async execute(): Promise<void> {
    // initialize configuration
    await this.initConfiguration();

    // execute pre section
    const preResult = await this.executePre();
    if (preResult.isFailure) {
      return process.exit(1);
    }

    // execute flow: checkout node chain -> execute commands for each phase -> upload artifacts
    const flowResult = await this.executeFlow();

    // execute post section
    const postResult = await this.executePost(flowResult.isFailure);

    if (flowResult.isFailure || postResult.isFailure) {
      return process.exit(1);
    }
  }
}

//new CLIRunner().execute();
