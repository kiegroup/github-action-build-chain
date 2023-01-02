import { Command } from "commander";

export interface CommandConstructor {
  /**
   * Construct the command line argument parser for the cli
   * @returns {Command} Command line argument parser object
   */
  createCommand(): Command;
}
