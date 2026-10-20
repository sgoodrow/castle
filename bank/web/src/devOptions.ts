import { useEffect, useState } from "react";

// Dev only: candidate looks to click between while iterating. Each option sets
// html[data-<key>] and is remembered across reloads. "primary" swaps the theme's primary colour.
export const OPTIONS: { key: string; label: string; values: string[] }[] = [
  { key: "kindIcons", label: "Spells, Sky, Other icons", values: ["scroll", "book", "wand", "sparkle", "flame"] },
];

const STORE = "castle-bank-dev";
export const load = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
// The first value of each option is the default, and is what ships.
const apply = (v: Record<string, string>) => OPTIONS.forEach(o => (document.documentElement.dataset[o.key] = v[o.key] ?? o.values[0]));
apply(load());

const EVENT = "castle-bank-dev";
// A primary colour to try on the Mantine theme, while a "primary" option is listed; otherwise the theme's own.
export function useDevPrimary(): string | undefined {
  const get = () => (import.meta.env.DEV && OPTIONS.some(o => o.key === "primary") && load().primary) || undefined;
  const [primary, setPrimary] = useState(get);
  useEffect(() => {
    const on = () => setPrimary(get());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return primary;
}

// The picked value of one option; the shipping default outside dev.
export function useDevOption(key: string): string {
  const def = OPTIONS.find(o => o.key === key)?.values[0] ?? "";
  const get = () => (import.meta.env.DEV && load()[key]) || def;
  const [v, setV] = useState(get);
  useEffect(() => {
    const on = () => setV((import.meta.env.DEV && load()[key]) || def);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [key, def]);
  return v;
}

// Pick a value for one option and tell every hook listening.
export function pickDevOption(v: Record<string, string>) {
  apply(v);
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* fine without */ }
  window.dispatchEvent(new Event(EVENT));
}
