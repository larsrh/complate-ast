# AST info

An `ASTInfo` object describes how to construct and convert an AST:

```typescript
import {AST, Introspection} from "../src/ast/base";
import {Builder} from "../src/ast/builder";

export interface ASTInfo<T extends AST, Forced = T> {
    readonly astKind: string;
    readonly builder: Builder<T>;
    readonly introspection?: Introspection<T>;
    force(t: T): Forced;
    asString(forced: Forced): string;
}
```

The second type parameter `Forced` and the related functions `force` and `asString` deserve some extra explanation.

When comparing two ASTs of the same kind with each other, different equality operators need to be used.

* `structured`: deep equality of objects
* `stream`: writing their contents to a buffer each and comparing the buffer contents
* `raw`: comparing the contained strings

None of these work with regular JavaScript equality (`===`).
However, the first and the last can be done using deep object equality (as e.g. provided in Jest's `toEqual` matcher).

This is trickier with `stream`, because functions can't be compared.
Consequently, before comparing two stream AST, we first need to _force_ them:

```typescript
import {force, AST as StreamAST} from "../src/ast/stream";

declare const ast1: StreamAST;
declare const ast2: StreamAST;

console.log(force(ast1) === force(ast2));
```

Libraries that work on arbitrary ASTs would have to special-case stream ASTs, which complicates their code.
The `info` object encapsulates this behaviour by providing a general `force` function.
For the stream AST, it returns `string`.
For the others, it is a no-op and returns the input unchanged.
Library authors that wish to extend `complate-ast` with e.g. the React tree could return the DOM node created by `ReactDOM.render`.

The additional `asString` function is required for low-level conformance testing.
The forced representation should be convertible to an HTML string.
The unit tests of `complate-ast` will:

1. use the `builder` to construct some trees,
2. maybe add items if possible through introspection,
3. force the tree,
4. convert the forced tree to a string, and
5. finally check that the HTML string looks as expected