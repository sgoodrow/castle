import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

// Dev only: candidate looks to click between while iterating. Each option sets
// html[data-<key>] and is remembered across reloads. "primary" swaps the theme's primary colour.
const OPTIONS: { key: string; label: string; values: string[] }[] = [];

const STORE = "castle-bank-dev";
const load = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
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
    const on = () => setV(get());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return v;
}

export function DevOptions() {
  const [v, setV] = useState(load);
  if (!OPTIONS.length) return null;
  const pick = (k: string, x: string) => {
    const next = { ...v, [k]: x };
    apply(next);
    setV(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* fine without */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <Paper p="xs" style={{ position: "fixed", right: 12, bottom: 12, zIndex: 300 }}>
      <Stack gap={4}>
        {OPTIONS.map(o => (
          <Group key={o.key} gap={4} wrap="nowrap">
            <Text fz="xs" c="dimmed" w={80}>{o.label}</Text>
            {o.values.map(x => (
              <Button key={x} size="compact-xs" variant={(v[o.key] ?? o.values[0]) === x ? "filled" : "default"} onClick={() => pick(o.key, x)}>{x}</Button>
            ))}
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
