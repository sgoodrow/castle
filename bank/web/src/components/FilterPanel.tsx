import { Divider, Paper, SegmentedControl, Stack, Switch, Text } from "@mantine/core";
import type { Item } from "../data";
import type { Filters } from "../state";
import { CharacterPicker } from "./CharacterPicker";
import { Doll } from "./Doll";

export const KINDS = [
  { value: "all", label: "All" }, { value: "gear", label: "Gear" }, { value: "spell", label: "Spells" },
  { value: "bag", label: "Bags" }, { value: "other", label: "Other" },
];

export function FilterPanel({ f, set, minimap, bare }: { f: Filters; set: (p: Partial<Filters>) => void; minimap: Item | null; bare?: boolean }) {
  const char = f.cls >= 0 || f.race >= 0;
  const body = (
    <Stack gap="md">
      <CharacterPicker cls={f.cls} race={f.race} onChange={set} />
      <Switch
        label="Only what my character can use"
        disabled={!char}
        checked={char && f.usableOnly}
        onChange={e => set({ usableOnly: e.currentTarget.checked })}
      />
      <Divider />
      <Stack gap={6}>
        <Text fz="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>Kind</Text>
        <SegmentedControl fullWidth size="xs" aria-label="Kind" value={f.kind} onChange={v => set({ kind: v as Filters["kind"] })} data={KINDS} />
      </Stack>
      <Doll item={minimap} slot={f.slot} onSlot={slot => set({ slot, ...(slot ? { kind: "all" as const } : {}) })} />
    </Stack>
  );
  return bare ? body : <Paper withBorder p="md" radius="md">{body}</Paper>;
}
