import * as Raw from "../../ast/raw";
import {spec} from "../../testkit/specs/ast";
import {rawText} from "../../ast/_text";

describe("Raw AST", () => {

    spec(Raw.info(), rawText);

});
