import { LoggerService } from "@bc/service/logger/logger-service";
import Container from "typedi";

export function logAndThrow(errorMessage: string): never {
  Container.get(LoggerService).logger.error(errorMessage);
  throw new Error(errorMessage);
}
