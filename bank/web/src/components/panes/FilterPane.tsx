import { ActionIcon, Divider, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { IconFilterOff } from "@tabler/icons-react";
import type { Item } from "../../data";
import { activeChips, type Filters } from "../../state";
import { CharacterPickerPane } from "./CharacterPickerPane";
import { DollPane } from "./DollPane";
import { CollapsibleLayout } from "../CollapsibleLayout";


const CLEARED: Partial<Filters> = { cls: -1, race: -1, kind: "all", slot: null, q: "" };

interface Props {
  f: Filters;
  set: (p: Partial<Filters>) => void;
  minimap: Item | null;
  bare?: boolean; // inside the phone drawer
  bar?: boolean; // one horizontal strip above the list
  search?: React.ReactNode; // the search box, at the top of the strip
}

export function FilterPane({ f, set, minimap, bare, bar, search }: Props) {
  // A slot means gear; a kind means no slot. The two never combine.
  const doll = (
    <DollPane item={minimap} slot={f.slot} kind={f.kind}
      onSlot={slot => set({ slot, ...(slot ? { kind: "all" as const } : {}) })}
      onKind={kind => set({ kind, slot: null })} />
  );
  // Always rendered so the header never changes size.
  const clear = (
    <Tooltip label="Clear filters">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Clear filters" disabled={!activeChips(f).length && !f.q} onClick={() => set(CLEARED)}>
        <IconFilterOff size={16} />
      </ActionIcon>
    </Tooltip>
  );

  if (bar) {
    return (
      <CollapsibleLayout id="filters" title="Search" actions={clear}>
        {search && (
          <Stack gap={6} pt="md" px="md">
            <Text fz="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>Filter by name</Text>
            {search}
          </Stack>
        )}
        <div style={{ display: "flex", gap: "var(--mantine-spacing-lg)", padding: "var(--mantine-spacing-md)" }}>
          <div style={{ flex: "none", width: 290 }}>{doll}</div>
          <Divider orientation="vertical" />
          <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
            <CharacterPickerPane cls={f.cls} race={f.race} onChange={set} row />
          </div>
        </div>
      </CollapsibleLayout>
    );
  }

  const body = (
    <Stack gap="md">
      {doll}
      <Divider />
      <CharacterPickerPane cls={f.cls} race={f.race} onChange={set} />
      {clear}
    </Stack>
  );
  return bare ? body : <Paper withBorder p="md" radius="md">{body}</Paper>;
}
