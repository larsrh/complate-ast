import {builder, DOMNodeAST, StructuredAST} from "./ast";
import {jsdomRenderer} from "./renderers/nodejs-dom";

const ast: StructuredAST =
    builder.element("div", new Map<string, string>([["lang", "en"]]),
        builder.text("Hello"),
        builder.element("br"),
        builder.element("span", new Map<string, string>([["lang", "de"]]),
            builder.text("<Welt>")
        )
    );

const dom: Node = ast.render(jsdomRenderer);

console.log((dom as Element).innerHTML);

const outerAST: DOMNodeAST =
    builder.element("div", undefined,
        builder.prerendered(dom.cloneNode(true))
    );

const outerDOM: Node = outerAST.render(jsdomRenderer);

console.log((outerDOM as Element).innerHTML);
