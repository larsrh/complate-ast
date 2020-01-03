import {Runtime} from "../util";
import {ProcessedAttributes, ProcessedChildren, Tag} from "./util";
import * as ESTree from "estree";
import * as Reify from "../../../estree/reify";
import * as Structured from "../../../ast/structured";
import {Factory} from "../optimizing";

export class StructuredFactory implements Factory {
    makeElement(
        runtime: Runtime,
        tag: Tag,
        attributes: ProcessedAttributes,
        children: ProcessedChildren
    ): ESTree.Expression {
        return Reify.object({
            astType: Reify.string("structured"),
            nodeType: Reify.string("element"),
            tag: tag.expr,
            // structured mode doesn't care about falsy attributes; renderers will take care of it
            attributes: attributes.reified,
            children: children.normalized(runtime).raw
        });
    }

    reify(runtime: Runtime, ast: Structured.AST): ESTree.Expression {
        return Reify.any(ast);
    }
}
