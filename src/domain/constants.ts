import { EntryPoint } from "@bc/domain/entry-point";
import { Token } from "typedi";

export const constants = {
  CONTAINER: {
    ENTRY_POINT: new Token<EntryPoint>("entry-point"),
  },
  GITHUB: {
    TOKEN: new Token<string>("token"),
    TOKEN_POOL: new Token<string[]>("token-pool")
  },
};
