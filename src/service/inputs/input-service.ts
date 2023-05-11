import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { Service } from "typedi";

@Service()
export class InputService {
  // store parsed options
  private _inputs: InputValues = defaultInputValues;

  /**
   * Getter for parsed options
   * @returns Object containing parsed options
   */
  get inputs(): InputValues {
    return this._inputs;
  }

  /**
   * Updates the parsed options
   * @param updatedInputs Options that were obtained from the parser
   */
  updateInputs(updatedInputs: Partial<InputValues>) {
    this._inputs = { ...this.inputs, ...updatedInputs };
  }
}
