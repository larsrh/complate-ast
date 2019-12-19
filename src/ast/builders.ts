import * as Universal from "./universal";
import * as Structured from "./structured";
import * as Raw from "./raw";
import * as Stream from "./stream";

export const allBuilders: { [key in Universal.Kind]: Universal.Builder } = {
    "structured": Structured.astBuilder,
    "raw": Raw.astBuilder,
    "stream": Stream.astBuilder
};
