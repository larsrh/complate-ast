import {SemiStructuredAST} from "../ast";
import * as _ from "lodash";
/*
export namespace JSX {

}

export function createElement(f: (props: any) => StructuredAST, p: any, ...children: any[]): StructuredAST {
    let _p = p || {};
    if (children.length > 0) {
        const _children = _.flattenDeep(children);
        _children.forEach(child => {
            if (!(child instanceof StructuredAST))
                throw new Error("Child is not of class StructuredAST");
        });
        _p.children = _children;
    }
    return f(_p);
}*/
