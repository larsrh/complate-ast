import {Builder} from "../builder";
import {Attributes, AttributeValue} from "../../jsx/syntax";
import {mapObject} from "../../util";

export class ZipBuilder<A1, A2, P1, P2, AV1, AV2> implements Builder<[A1, A2], [P1, P2], [AV1, AV2]> {
    constructor(
        private readonly builder1: Builder<A1, P1, AV1>,
        private readonly builder2: Builder<A2, P2, AV2>
    ) {}

    attributeValue(value: AttributeValue): [AV1, AV2] {
        return [this.builder1.attributeValue(value), this.builder2.attributeValue(value)];
    }

    element(tag: string, _attributes?: Attributes<[AV1, AV2]>, ...children: [A1, A2][]): [A1, A2] {
        const attributes = _attributes ? _attributes : {};
        return [
            this.builder1.element(tag, mapObject(attributes, tuple => tuple[0]), ...children.map(tuple => tuple[0])),
            this.builder2.element(tag, mapObject(attributes, tuple => tuple[1]), ...children.map(tuple => tuple[1]))
        ];
    }

    prerendered(p: [P1, P2]): [A1, A2] {
        return [this.builder1.prerendered(p[0]), this.builder2.prerendered(p[1])];
    }

    text(text: string): [A1, A2] {
        return [this.builder1.text(text), this.builder2.text(text)];
    }
}
