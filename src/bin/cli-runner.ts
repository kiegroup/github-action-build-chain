#!/usr/bin/env node

import { Runner } from "@bc/bin/runner";

class CLIRunner extends Runner {
  initializeConfig(): void {
    //TODO: to implement
  }
}

new CLIRunner().execute();