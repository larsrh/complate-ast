import {Attributes, AttributeValue} from "../../jsx/syntax";

export interface Builder<A, P = never, AV = AttributeValue> {
    text(text: string): A;
    prerendered(p: P): A;
    element(tag: string, attributes?: Attributes<AV>, ...children: A[]): A;
    attributeValue(key: string, value: AttributeValue): AV;
}
