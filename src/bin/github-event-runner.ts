#!/usr/bin/env node

import { Runner } from "@bc/bin/runner";
import { EntryPoint } from "@bc/domain/entry-point";

class GithubEventRunner extends Runner {

  constructor() {
    super(EntryPoint.GITHUB_EVENT);
  }

  initializeConfig(): void {
    //TODO: to implement
  }
}

new GithubEventRunner().execute();