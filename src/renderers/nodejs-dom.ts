import {DOMBuilder} from "./dom"
import {JSDOM} from "jsdom"

export const jsdomBuilder: DOMBuilder = new DOMBuilder(new JSDOM().window.document);
