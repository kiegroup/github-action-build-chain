import { TreatmentOptions } from "@bc/domain/treatment-options";

export interface CommandTreatment {
  treat(command: string, options: TreatmentOptions): string;
}