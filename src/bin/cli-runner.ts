#!/usr/bin/env node

import { Runner } from "@bc/bin/runner";
import { EntryPoint } from "@bc/domain/entry-point";

class CLIRunner extends Runner {

  constructor() {
    super(EntryPoint.CLI);
  }

  initializeConfig(): void {
    //TODO: to implement
  }
}

new CLIRunner().execute();