import { TreatmentOptions } from "@bc/domain/treatment-options";

export interface Configuration {
  // TODO: to implement
  token: string;
  treatmentOptions?: TreatmentOptions;
  startingProject?: string;
  projectTriggeringTheJob: string;
  skipProjectCheckout?: string[],
  skipProjectExecution?: string[],
  skipCheckout: boolean,
  skipExecution: boolean
}

export const defaultValue: Readonly<Configuration> = {
  token: "",
  projectTriggeringTheJob: "",
  skipCheckout: false,
  skipExecution: false,
};
