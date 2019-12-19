export {normalizeChildren} from "../renderers/normalize";
export {escapeHTML} from "../util";

export {astBuilder as streamBuilder} from "../ast/stream";
export {astBuilder as structuredBuilder} from "../ast/structured";
export {astBuilder as rawBuilder} from "../ast/raw";

export function Fragment<T>(props: {}, ...children: T[]): T[] {
    return children;
}