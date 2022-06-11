#!/usr/bin/env node

import { Runner } from "@bc/bin/runner";

class GithubEventRunner extends Runner {
  initializeConfig(): void {
    //TODO: to implement
  }
}

new GithubEventRunner().execute();