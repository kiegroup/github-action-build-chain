import { EntryPoint } from "@bc/domain/entry-point";
import { Token } from "typedi";

export const constants = {
  CONTAINER: {
    ENTRY_POINT: new Token<EntryPoint>("entry-point"),
  },
};
