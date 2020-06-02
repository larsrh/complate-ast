function List({ ordered }, ...children) {
    let items = children.map(item => (
        <li>{item}</li>
    ));
    return ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
}

function Article({ title, tags }, ...children) {
    return <article>
        <h2>{title}</h2>
        <List ordered>{[...tags]}</List>
        {children}
    </article>;
}

<>
    <__UnsafeRaw html="<!DOCTYPE HTML>" />
    <html>
        <body>
            <h1>Hello World</h1>

            <Article title="Lipsum" tags={["foo", "bar"]}>
                <p>lorem ipsum dolor sit amet</p>
            </Article>
        </body>
    </html>
</>
