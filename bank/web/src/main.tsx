import { createRoot } from "react-dom/client";
import { bankPage } from "./app";

const root = createRoot(document.getElementById("root")!);
bankPage().then(page => root.render(page));
