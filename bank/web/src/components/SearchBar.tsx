import { ActionIcon, Badge, Button, CloseButton, Group, Indicator, Popover, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { BANKERS, CLASSES, RACES } from "../data";
import type { Filters } from "../state";
import { KINDS } from "./FilterPanel";

export const SORTS: Record<string, string> = {
  name: "Name", ac: "AC", hp: "HP", mana: "Mana", stats: "Total stats", resists: "Total resists",
  price: "Green price", sellers: "Green sellers", count: "Quantity in bank",
};

interface Props {
  f: Filters;
  set: (p: Partial<Filters>) => void;
  onFilters?: () => void; // phones: open the filter drawer
}

// The active filters as removable chips.
function activeChips(f: Filters): { label: string; clear: Partial<Filters> }[] {
  const out: { label: string; clear: Partial<Filters> }[] = [];
  if (f.cls >= 0) out.push({ label: CLASSES[f.cls][1], clear: { cls: -1 } });
  if (f.race >= 0) out.push({ label: RACES[f.race][1], clear: { race: -1 } });
  if ((f.cls >= 0 || f.race >= 0) && f.usableOnly) out.push({ label: "Usable only", clear: { usableOnly: false } });
  if (f.kind !== "all") out.push({ label: KINDS.find(k => k.value === f.kind)!.label, clear: { kind: "all" } });
  if (f.slot) out.push({ label: `Slot: ${f.slot.toLowerCase()}`, clear: { slot: null } });
  if (f.banker) out.push({ label: `Banker: ${f.banker}`, clear: { banker: null } });
  if (f.sort !== "name") out.push({ label: `Sort: ${SORTS[f.sort]}`, clear: { sort: "name" } });
  return out;
}

export function SearchBar({ f, set, onFilters }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const chips = activeChips(f);
  const advancedOn = !!f.banker || f.sort !== "name";
  return (
    <Stack gap="xs">
      {/* Always one line tall so adding or removing a filter never moves the page. */}
      <Group gap={6} wrap="nowrap" h={30} style={{ overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
        {chips.length === 0 && <Text fz="sm" c="dimmed">No filters yet</Text>}
          {chips.map(c => (
            <Badge
              key={c.label}
              size="lg"
              style={{ flex: "none" }}
              variant="light"
              tt="none"
              fw={500}
              rightSection={
                <ActionIcon size="xs" variant="transparent" color="gray" aria-label={`Remove ${c.label}`} onClick={() => set(c.clear)}>
                  <IconX size={12} />
                </ActionIcon>
              }
            >
              {c.label}
            </Badge>
          ))}
          {chips.length > 1 && (
            <Button size="compact-xs" variant="subtle" color="gray" style={{ flex: "none" }}
              onClick={() => set({ cls: -1, race: -1, kind: "all", slot: null, banker: null, sort: "name" })}>
              Clear all
            </Button>
          )}
      </Group>
      <Group gap="xs" wrap="nowrap">
        {onFilters && (
          <Indicator disabled={!chips.length} label={chips.length} size={16}>
            <ActionIcon size={50} radius="xl" variant="default" aria-label="Filters" onClick={onFilters}>
              <IconFilter size={20} />
            </ActionIcon>
          </Indicator>
        )}
        <TextInput
          style={{ flex: 1 }}
          size="lg"
          radius="xl"
          aria-label="Search the bank"
          placeholder={onFilters ? "Search the bank" : "Search the bank: names and stats, e.g. haste, FR, mana"}
          leftSection={<IconSearch size={20} />}
          rightSectionWidth={90}
          rightSection={
            <Group gap={2} wrap="nowrap" pr={6}>
              <CloseButton aria-label="Clear search" onClick={() => set({ q: "" })} style={{ visibility: f.q ? "visible" : "hidden" }} />
              <Popover opened={advanced} onChange={setAdvanced} position="bottom-end" width={320} shadow="md" withinPortal>
              <Popover.Target>
              <ActionIcon
                variant={advanced || advancedOn ? "light" : "subtle"}
                color={advancedOn ? undefined : "gray"}
                radius="xl"
                size="lg"
                aria-label="Advanced options"
                aria-expanded={advanced}
                onClick={() => setAdvanced(a => !a)}
              >
                <IconAdjustmentsHorizontal size={20} />
              </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Select label="Sort by" allowDeselect={false} comboboxProps={{ withinPortal: false }} data={Object.entries(SORTS).map(([value, label]) => ({ value, label }))} value={f.sort} onChange={v => v && set({ sort: v })} />
                  <Select label="Held by banker" placeholder="Any banker" clearable searchable comboboxProps={{ withinPortal: false }} data={BANKERS} value={f.banker} onChange={v => set({ banker: v })} />
                </Stack>
              </Popover.Dropdown>
              </Popover>
            </Group>
          }
          value={f.q}
          onChange={e => set({ q: e.currentTarget.value })}
        />
      </Group>
    </Stack>
  );
}
