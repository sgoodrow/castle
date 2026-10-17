import type { ReactNode } from "react";

// One shared tooltip for every truncated text on the page. Rows stay cheap:
// nothing is measured or mounted until the pointer actually lands on one.
export type Tip = { label: ReactNode; x: number; y: number } | null;
let listener: (t: Tip) => void = () => {};
export const onTip = (fn: (t: Tip) => void) => { listener = fn; };
export const showTip = (t: Tip) => listener(t);
