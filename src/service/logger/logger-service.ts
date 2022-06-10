export interface LoggerService {
  startGroup(message: string): void;

  endGroup(): void;

  trace(message: string): void;

  debug(message: string): void;

  info(message: string): void;

  warn(message: string): void;
}