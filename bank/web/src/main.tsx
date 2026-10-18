import { createRoot } from "react-dom/client";
import { bankPage } from "./app";

// index.html ships the #root element, so it's always there.
const root = createRoot(document.getElementById("root")!);
bankPage().then(page => root.render(page));
