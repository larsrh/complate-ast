import {builder, render, DOMNodeAST, StructuredAST} from "./ast/structured";
import {jsdomRenderer} from "./renderers/nodejs-dom";
import {StreamRenderer, StringStream} from "./renderers/stream";

const ast: StructuredAST<never> =
    builder.element("div", { lang: "en" },
        builder.text("Hello"),
        builder.element("br"),
        builder.element("span", { lang: "de" },
            builder.text("<Welt>")
        )
    );

const dom: Node = render(ast, jsdomRenderer);

console.log((dom as Element).innerHTML);

const outerAST: DOMNodeAST =
    builder.element("div", undefined,
        builder.prerendered(dom.cloneNode(true))
    );

const outerDOM: Node = render(outerAST, jsdomRenderer);

console.log((outerDOM as Element).innerHTML);

const stream = new StringStream();
render(ast, new StreamRenderer(stream))();

console.log(stream.content);
