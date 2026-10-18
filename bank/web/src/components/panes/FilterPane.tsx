import { Divider, Paper, Stack, Text } from "@mantine/core";
import type { Item } from "../../data";
import type { Filters } from "../../state";
import { CharacterPickerPane } from "./CharacterPickerPane";
import { DollPane } from "./DollPane";
import { CollapsibleLayout } from "../CollapsibleLayout";
import { ClearFiltersButton } from "../buttons/ClearFiltersButton";

interface Props {
  f: Filters;
  set: (p: Partial<Filters>) => void;
  minimap: Item | null;
  bare?: boolean; // inside the phone drawer, which has its own clear button
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
  const clear = <ClearFiltersButton f={f} set={set} />;

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
      {!bare && clear}
    </Stack>
  );
  return bare ? body : <Paper withBorder p="md" radius="md">{body}</Paper>;
}
