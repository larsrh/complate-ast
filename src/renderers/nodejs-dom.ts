import { DOMRenderer } from "./dom"
import { JSDOM } from "jsdom"

export const jsdomRenderer: DOMRenderer = new DOMRenderer(new JSDOM().window.document);
