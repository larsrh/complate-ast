# Abstract syntax trees

Any AST in `complate-ast` needs to provide a string field `astKind`:

```typescript
declare interface AST {
    readonly astKind: string;
}
```

This field may contain an arbitrary string, but application developers should either stick to the predefined kinds or make sure they choose a unique name.

## Structured AST

A structured AST contains full information about the HTML element tree.
As such, a tree node can either be:

* text, containing an unescaped string;
* an element with a tag name, an object with key-value pairs representing the attributes and containing an array of children; or
* prerendered, containing an arbitrary object that is considered to be already “ready“ and won't be converted further

Given that `complate-ast` is implemented in TypeScript, the structured AST class has a type parameter `P` for the type of objects contained in prerendered nodes.
In most situations, this doesn't happen, so `P` defaults to `never`.

Walking a structured AST manually is possible, but it is much more convenient to use a _builder_ together with the `render` function:

```typescript
import {AST as StructuredAST} from "../src/ast/structured";

declare type Attributes = Record<string, string | boolean | null | undefined>

declare interface Builder<A, P = never> {
    text(text: string): A;
    prerendered(p: P): A;
    element(tag: string, attributes?: Attributes, ...children: A[]): A;
}

declare function render<P, A>(ast: StructuredAST<P>, builder: Builder<A, P>): A;
```

`complate-ast` ships with a range of predefined builders.

* builders for all AST kinds
* DOM
* compacting (i.e. filtering out falsy attributes)

For example, an existing structured AST can be converted to a DOM node as follows:

```typescript
import {DOMBuilder} from "../src/ast/builders/dom";
import {render, AST as StructuredAST} from "../src/ast/structured";

const builder = new DOMBuilder(window.document);

declare const ast: StructuredAST;

const node: Node = render(ast, builder);
```

The DOM builder supports prerendered nodes that are already DOM nodes, e.g. nodes that have already been created by other means.

```typescript
import {DOMBuilder} from "../src/ast/builders/dom";
import {render, AST as StructuredAST} from "../src/ast/structured";

const builder = new DOMBuilder(window.document);

declare const ast: StructuredAST<Node>;

const node: Node = render(ast, builder);
```

Both of the above examples assume the existence of a structured AST.
But builders can also be used without them as a convenient way to construct objects manually, e.g.:

```typescript
import {DOMBuilder} from "../src/ast/builders/dom";

const builder = new DOMBuilder(window.document);

const node = builder.element("span", { class: "highlight" }, builder.text("Hi!"));
```

This directly creates a DOM node equivalent to the HTML snippet `<span class="highlight">Hi!</span>`.

## Stream AST

The stream AST is not a real AST in the compiler sense, but rather a function that can directly write its own string representation into a buffer:

```typescript
declare interface Buffer {
    write(content: string): void;
}

declare interface StreamAST {
    readonly astKind: "stream";
    render(buffer: Buffer): void;
}

declare function force(ast: StreamAST): string;
```

The `force` function exists for debugging purposes and writes the whole stream into an in-memory buffer.
Note that the buffer is always assumed to be synchronous.

Even though it is impossible to poke into a function and modify its inner workings in JavaScript, the stream AST offers a few extension points.
Using the high-level introspection API, users can add additional children and additional attributes to an already constructed stream AST:

```typescript
import {addItems} from "../src/ast";
import {force, AST as StreamAST} from "../src/ast/stream";

declare const ast: StreamAST;

console.log(force(ast));
// "<span></span>"

const updated = addItems(ast, { class: "highlight" }, ast);

console.log(force(ast));
// "<span></span>"

console.log(force(updated));
// "<span class=\"highlight\"><span></span></span>"
```

This operations will fail if the stream AST is not an element (i.e. a plain-text node).

This ability to add more items (attributes or children) is why this representation can be seen as a write-only AST.

Apart from adding items and writing to a buffer, there are no other ways to interact with a stream AST.
The low-level API additionally allows manipulation of items that have been added through introspection, but never the items that were already present when constructing the AST.

## Raw AST

The raw AST is even less of a real AST than the stream AST.
It consists just of a string:

```typescript
declare interface AST {
    readonly astKind: "raw";
    readonly value: string;
}
```

There is no useful operation on this AST, except for taking the value and treating it as HTML source.
The main purpose of this AST is for debugging, and to serve as a reference implementation for the others representations.
