interface CommandExecutor {
  execute(path: string, command: string): Promise<void>;
}