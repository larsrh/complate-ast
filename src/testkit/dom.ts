import {parseHTML} from "../ast/builders/dom";

// TODO add tests
export function compareHTML(html1: string, html2: string): void {
    if (html1 === html2)
        return;

    const dom1 = parseHTML(document, html1);
    const dom2 = parseHTML(document, html2);

    expect(dom2).toEqual(dom1);
}
