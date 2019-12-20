export {normalizeChildren} from "../ast/builders/normalize";
export {escapeHTML} from "./syntax";

export {astBuilder as streamBuilder} from "../ast/stream";
export {astBuilder as structuredBuilder} from "../ast/structured";
export {astBuilder as rawBuilder} from "../ast/raw";

export function Fragment<T>(props: {}, ...children: T[]): T[] {
    return children;
}