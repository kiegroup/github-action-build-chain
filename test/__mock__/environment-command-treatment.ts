import { TreatmentOptions } from "@bc/domain/treatment-options";

const mock = jest.fn().mockImplementation(() => ({
  treat(command: string, options: TreatmentOptions): string {
    return `${command} treated`;
  },
}));


export default mock;