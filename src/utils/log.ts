import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

export function logAndThrow(errorMessage: string): never {
    LoggerServiceFactory.getInstance().error(errorMessage);
    throw new Error(errorMessage);
}