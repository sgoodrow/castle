import { Chip, CloseButton, Group, Paper, SegmentedControl, Select, SimpleGrid, Switch, TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { BANKERS, CLASSES, RACES, SLOT_CHIPS } from "../data";
import type { Filters } from "../state";

export const SORTS: Record<string, string> = {
  name: "Name", ac: "AC", hp: "HP", mana: "Mana", stats: "Total stats", resists: "Total resists",
  price: "Green price", sellers: "Green sellers", count: "Quantity in bank",
};

const opts = (list: readonly (readonly [string, string])[]) => list.map(([, name], i) => ({ value: String(i), label: name }));

export function SearchPanel({ f, set }: { f: Filters; set: (p: Partial<Filters>) => void }) {
  const char = f.cls >= 0 || f.race >= 0;
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={2} fz="md" mb="sm">Search</Title>
      <TextInput
        aria-label="Search items"
        placeholder="Search names and stats, e.g. haste, FR, mana"
        leftSection={<IconSearch size={16} />}
        rightSection={f.q ? <CloseButton aria-label="Clear search" onClick={() => set({ q: "" })} /> : null}
        value={f.q}
        onChange={e => set({ q: e.currentTarget.value })}
        mb="sm"
      />
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="sm">
        <Select label="Class" placeholder="Any" clearable data={opts(CLASSES)} value={f.cls >= 0 ? String(f.cls) : null} onChange={v => set({ cls: v == null ? -1 : +v })} />
        <Select label="Race" placeholder="Any" clearable data={opts(RACES)} value={f.race >= 0 ? String(f.race) : null} onChange={v => set({ race: v == null ? -1 : +v })} />
        <Select label="Banker" placeholder="All" clearable searchable data={BANKERS} value={f.banker} onChange={v => set({ banker: v })} />
        <Select label="Sort by" allowDeselect={false} data={Object.entries(SORTS).map(([value, label]) => ({ value, label }))} value={f.sort} onChange={v => v && set({ sort: v })} />
      </SimpleGrid>
      <Group justify="space-between" gap="sm" mb="sm">
        <SegmentedControl
          size="xs"
          aria-label="Item kind"
          value={f.kind}
          onChange={v => set({ kind: v as Filters["kind"] })}
          data={[{ value: "all", label: "All" }, { value: "gear", label: "Gear" }, { value: "spell", label: "Spells" }, { value: "bag", label: "Bags" }, { value: "other", label: "Other" }]}
        />
        <Switch
          label="Only what my character can use"
          disabled={!char}
          checked={char && f.usableOnly}
          onChange={e => set({ usableOnly: e.currentTarget.checked })}
        />
      </Group>
      <Group gap={6} role="group" aria-label="Slot">
        {SLOT_CHIPS.map(([label]) => (
          <Chip key={label} size="xs" checked={f.slot === label} onChange={on => set({ slot: on ? label : null })}>
            {label}
          </Chip>
        ))}
      </Group>
    </Paper>
  );
}
