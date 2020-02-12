import {ProcessedAttributes} from "../util";
import {ProcessedChildren, Tag} from "./util";
import * as ESTree from "estree";
import * as Reify from "reify-to-estree";
import * as Structured from "../../../ast/structured";
import {Factory} from "../optimizing";
import {RuntimeModule} from "../../runtime";

export class StructuredFactory implements Factory {
    readonly kind = "structured";

    makeElement(
        runtime: RuntimeModule,
        tag: Tag,
        attributes: ProcessedAttributes,
        children: ProcessedChildren
    ): ESTree.Expression {
        return Reify.object({
            astKind: Reify.string("structured"),
            nodeType: Reify.string("element"),
            tag: tag.expr,
            attributes: runtime.normalizeAttributes(attributes.merged),
            children: children.normalized(this.kind, runtime).raw
        });
    }

    reify(runtime: RuntimeModule, ast: Structured.AST): ESTree.Expression {
        return Reify.any(ast);
    }
}
