import { InputValues } from "@bc/domain/inputs";
import { Service } from "typedi";

@Service()
export class ParsedInputs {
    // store parsed options
    private _inputs: InputValues = {};

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
    updateInputs(updatedInputs: InputValues) {
        this._inputs = {...this.inputs, ...updatedInputs};
    }
}