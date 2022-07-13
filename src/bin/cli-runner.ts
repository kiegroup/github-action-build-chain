#!/usr/bin/env node

import "reflect-metadata";
import { Runner } from "@bc/bin/runner";
import { EntryPoint } from "@bc/domain/entry-point";

class CLIRunner extends Runner {
  constructor() {
    super(EntryPoint.CLI);
  }
}

new CLIRunner().execute();
