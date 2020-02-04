# Preprocessing

The major use case of `complate-ast` is the _preprocessing_ (or _transpiling_, as it is often called) of JavaScript code.
As input, `complate-ast` takes JS code that contains JSX tags.
As output, it produces code that doesn't and instead uses one of the AST representations.

## React-style

In “React-style” JSX preprocessing, all tags get replaced by a very simple scheme.
We're assuming that you're familiar with the general idea, so we'll only have a brief reminder here:

```typescript jsx
declare namespace React {
    function createElement(tag: any, props: object, ...children: any[]);
}

// input
const in = <div class={ "con" + "tainer" }>text</div>;

// output
const out = React.createElement("div", { class: "con" + "tainer" }, "text");
```

The disadvantage of React-style preprocessing is that it incurs runtime overhead for every element, even though the result may already be known statically to the preprocessor.

## complate-style

In “complate-style” preprocessing, we try to be as flexible and as performant as possible.
As such, the preprocessor can be configured along two axes:

target
: determines the AST kind that will be produced at runtime (structured, stream, raw)

mode
: either _simple_ (which emulates React) or _optimizing_ (which maximizes performance)

We'll now look at various inputs and examine the result of complate-style preprocessing (i.e. _optimizing_ mode).

Note that for clarity, all runtime methods are presumed to be imported through the `JSXRuntime` namespace.
In reality, they are imported piecewise with a prefix (e.g. `import {__prefix__normalizeChildren} from "./runtime"`).

### Example 1: Fully static

```typescript jsx
<div class="highlight" id={ "xy" }><span>text</span></div>;
```

#### Structured target

```javascript
({
  "tag": "div",
  "attributes": {
    "class": "highlight",
    "id": "xy"
  },
  "children": [{
    "tag": "span",
    "attributes": {},
    "children": [{
      "text": "text",
      "nodeType": "text",
      "astKind": "structured"
    }],
    "nodeType": "element",
    "astKind": "structured"
  }],
  "nodeType": "element",
  "astKind": "structured"
});
```

#### Stream target

```javascript
({
  "astKind": "stream",
  "isElement": true,
  "render": function (__buffer__3) {
    __buffer__3.write("<div");
    if (this._extraAttributes === void 0) {
      __buffer__3.write(" class=\"highlight\" id=\"xy\"");
    } else {
      __buffer__3.write(JSXRuntime.renderAttributes({
        ...{
          "class": "highlight",
          "id": "xy"
        },
        ...this._extraAttributes
      }));
    }
    __buffer__3.write(">");
    __buffer__3.write("<span>text</span>");
    if (this._extraChildren) this._extraChildren.forEach(x => x.render(__buffer__3));
    __buffer__3.write("</div>");
  }
});
```

Without a doubt, this target emits the most complicated code.
The complications are due to the fact that additional attributes and children may be added at runtime.
But note that the code already contains static strings for HTML code that can't be modified anymore (introspection only works one layer deep).

In case no introspection happens, the code can be simplified to:

```javascript
({
  "astKind": "stream",
  "render": function (__buffer__3) {
    __buffer__3.write("<div");
    __buffer__3.write(" class=\"highlight\" id=\"xy\"");
    __buffer__3.write(">");
    __buffer__3.write("<span>text</span>");
    __buffer__3.write("</div>");
  }
});
```

#### Raw target

```javascript
({
  "astKind": "raw",
  "value": "<div class=\"highlight\" id=\"xy\"><span>text</span></div>"
});
```

### Example 2: Dynamic attributes

```typescript jsx
declare const attrs: object;

<div class="highlight" class={ undefined } {...attrs}><span>text</span></div>;
```

#### Structured target

```javascript
({
  "astKind": "structured",
  "nodeType": "element",
  "tag": "div",
  "attributes": JSXRuntime.normalizeAttributes({
    class: "highlight",
    ...attrs
  }),
  "children": [{
    "tag": "span",
    "attributes": {},
    "children": [{
      "text": "text",
      "nodeType": "text",
      "astKind": "structured"
    }],
    "nodeType": "element",
    "astKind": "structured"
  }]
});
```

#### Stream target

```javascript
({
  "astKind": "stream",
  "isElement": true,
  "render": function (__buffer__3) {
    __buffer__3.write("<div");
    __buffer__3.write(JSXRuntime.renderAttributes({
      ...{
        class: "highlight",
        ...attrs
      },
      ...this._extraAttributes
    }));
    __buffer__3.write(">");
    __buffer__3.write("<span>text</span>");
    if (this._extraChildren) this._extraChildren.forEach(x => x.render(__buffer__3));
    __buffer__3.write("</div>");
  }
});
```

Note that while the attributes have to go through runtime processing, the static children are already rendered as in the previous example.

#### Raw target

```javascript
({
  "astKind": "raw",
  "value": ["<div", JSXRuntime.renderAttributes({
    class: "highlight",
    ...attrs
  }), ">", ...["<span>text</span>"], "</div>"].join("")
});
```

### Example 3: Macro

```typescript jsx
<Div><span>text</span></Div>;
```

#### Structured target

```javascript
Div({}, ...[{
  "tag": "span",
  "attributes": {},
  "children": [{
    "text": "text",
    "nodeType": "text",
    "astKind": "structured"
  }],
  "nodeType": "element",
  "astKind": "structured"
}]);
```

#### Stream target

```javascript
Div({}, ...[{
  "astKind": "stream",
  "isElement": true,
  "render": function (__buffer__2) {
    __buffer__2.write("<span");
    if (this._extraAttributes === void 0) {
      __buffer__2.write("");
    } else {
      __buffer__2.write(JSXRuntime.renderAttributes({
        ...{},
        ...this._extraAttributes
      }));
    }
    __buffer__2.write(">");
    __buffer__2.write("text");
    if (this._extraChildren) this._extraChildren.forEach(x => x.render(__buffer__2));
    __buffer__2.write("</span>");
  }
}]);
```

Note that the inner `<span>text</span>` is not present as a static string in order to allow `Div` to modify it.

#### Raw target

```javascript
Div({}, ...[{
  "astKind": "raw",
  "value": "<span>text</span>"
}]);
```
