# Concepts

## Tags

In JSX, there are two different kinds of tags: starting with an lower or upper-case letter.
Lower-case tags are directly transformed into an HTML element.
Upper-case tags create a component (in React parlance).

`complate-ast` differs slightly in terminology: we call components _macros_.

Also, `complate-ast` adds another type of tag: starting with a dollar symbol (`$`).
Those are called _dynamic tags_.
They are useful for e.g. selecting the heading level:

```typescript jsx
function H({ level }, ...children) {
    const tag = "h" + level;
    return <$tag>{ ... children }</$tag>;
}

const x = <H level={ 1 }>section</H>;    // <h1>section</h1>
const y = <H level={ 2 }>subsection</H>; // <h2>subsection</h2>
```

## AST

An _abstract syntax tree_, or _AST_ for short, is a concept from compiler construction.
A syntax tree captures the entire structure of some piece of source code.
It is called _abstract_ because it abstracts away from _concrete_ syntax.

### ESTree

For example, the following snippet is concrete syntax:

```javascript
1 + 2
```

Represented as an abstract syntax tree, it would look as follows:

```
Node {
  type: 'ExpressionStatement',
  expression: Node {
    type: 'BinaryExpression',
    left: Node { type: 'Literal', start: 1, end: 2, value: 1, raw: '1' },
    operator: '+',
    right: Node { type: 'Literal', start: 5, end: 6, value: 2, raw: '2' }
  }
}
```

This object representation is specified in the [ESTree spec][estree].

ESTree objects may contain any syntactic form of JavaScript.
In particular, JSX elements can also be represented:

```typescript jsx
const element = <span>Hello</span>;
```

This would result in a (rather large) tree:

```
Node {
  type: 'JSXElement',
  openingElement: Node {
    type: 'JSXOpeningElement',
    attributes: [],
    name: Node {
      type: 'JSXIdentifier',
      name: 'span'
    },
    selfClosing: false
  },
  closingElement: Node {
    type: 'JSXClosingElement',
    name: Node {
      type: 'JSXIdentifier',
      name: 'span'
    }
  },
  children: [
    Node {
      type: 'JSXText',
      value: 'Hello',
      raw: 'Hello'
    }
  ]
}
```

In reality, ESTree objects also contain other information pertaining to source code locations, which allows many tools to retain whitespaces and comments when transforming files.

### complate-ast

The goal of `complate-ast` is to provide an abstract syntax tree specifically tailored for JSX that can be rendered to multiple different targets:

* plain string
* streaming
* DOM
* React shadow DOM
* ...

`complate-ast` can read in an ESTree and transform it (as far as possible) into its own AST format.

For example, `<span>Hello</span>` can be expressed in `complate-ast` as follows:

```
ElementNode {
  tag: 'span',
  attributes: {},
  children: [
    TextNode { text: 'Hello', nodeType: 'text', astKind: 'structured' }
  ],
  nodeType: 'element',
  astKind: 'structured'
}
```

At a later point, this AST can be rendered directly into a string (or other formats).

Note that a complate AST contains nothing else than pure HTML elements: nested JS code is not permitted.
A JSX snippet like

```typescript jsx
const myClass = "test";
return (
    <span class={ myClass }>
        Hello
    </span>
);
```

... can't be directly represented as a complate AST, even though ESTree could handle it just fine.

## Static/Dynamic

The distinction between _static_ and _dynamic_ phases is blurred in interpreted languages like JavaScript.
A transformation is _static_ if it happens before code execution.
For example, tools like Babel or Rollup perform static transformations on source code.
When using React, the substitution of JSX into a sequence of `React.createElement` calls is also static.
However, turning those calls into the shadow DOM is _dynamic_ because it requires execution of user-written code.

Another way to think about this distinction is when looking at packaging code for the browser (static) vs. the browser running that code (dynamic).

With most UI libraries that use JSX, for example React, Preact and others, there is a very clear static/dynamic distinction.
This may lead to inefficiencies.
Consider the following code:

```typescript jsx
function Macro(props, children) {
    // wrap children into other elements
}

const page =
    <Macro foo="bar">
        <div class="container">Content!</div>
    </Macro>;
```

We can't _statically_ know the whole content of `page`.
In particular, the `Macro` could fetch data from somewhere, toss a coin, or discard the children altogether.
It has to be executed.

But we do know the static content of the `<div>` that's nested inside the macro.
When rendered to a string, we expect exactly the following value:

```typescript
"<div class=\"container\">Content!</div>"
```

The preprocessor bundled with `complate-ast` tries to determine the _static_ parts of the JSX tree and evaluates those fully, leaving the _dynamic_ parts to the runtime.

## Runtime

In case the JSX tree can't be fully evaluated by the preprocessor (e.g., if there are macro invocations), `complate-ast` falls back to dynamic function calls similar to `React.createElement`.
For improved performance and to give tree shaking a better chance and minifying the resulting code, `complate-ast` uses a bunch of smaller, more focused functions.
For example, `normalizeChildren` flattens a nested array of children and `renderAttributes` converts attributes into a string.
The set of all these helper functions is called the _runtime_ of `complate-ast`.

## AST kinds

Designing an AST comes with inherent trade-offs, e.g. about performance when converting it to a string,
`complate-ast` tries to be agnostic about this and admits multiple different representations to co-exist.
In our terminology, those representations are called _kinds_.
We take a little freedom compared to compiler terminology, because not all of them are strictly speaking syntax _trees_.

| 🗄️ AST kind  | 📝 Description          | 🙂 Pros               | 🙁 Cons          |
| ------------ | ---------------------- | -------------------- | --------------- |
| structured   | complete structure of HTML including attributes with their original types                  | easiest to manipulate, most versatile, can be transformed to any other kind | least efficient                       |
| stream       | a function that, when called with a buffer, writes its string representation to the buffer | most performant for use in a web server that pushes the HTML to a client    | only limited ability for manipulation |
| raw          | a pure string containing HTML                                                              | easiest to debug                                                            | builds the entire HTML in memory, least versatile |

The “gold standard” is the structured AST, given that it contains the full information of the HTML representation.
Attributes and text children in the structured AST are therefore not escaped and will be escaped when converting to a string.
The structured AST also offers the option to convert directly to a DOM node in the browser.

Application developers may extend `complate-ast` with other custom AST representations.
A custom AST design is free to e.g. lift the restriction that the built-in representations don't contain unevaluated macros.

## Builder

A _builder_ is the abstraction for a transformation from a structured AST to an arbitrary other representation.
This includes conversion to string, stream and raw ASTs, DOM and others.
A builder is similar to a visitor object that needs to specify what needs to be done when encountering an element or a text node.

A special case of a builder is an _ESTree builder_ which is used to statically construct JavaScript syntax that when evaluated, produces a given AST.
While part of the public API of `complate-ast`, it should only be rarely necessary to extend the predefined builders.

## Immutability

Without exception, all functions in `complate-ast` operate on immutable values.
Classes assume that their properties are not modified, in particular arrays.
Modifying values leads to undefined behaviour.

[estree]: https://github.com/estree/estree