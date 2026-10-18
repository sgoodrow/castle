import { Divider, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconHeartPlus, IconShieldHalf, IconSkull, IconSun, IconSwords, IconTornado, IconWand } from "@tabler/icons-react";
import { CLASS_NAME, RACE_NAME, validCombo, type ClassId, type RaceId } from "../../data";
import classes from "./CharacterPickerPane.module.css";
import { OverflowText } from "../texts/OverflowText";

// A small mark so each category reads at a glance.
const GROUP_MARK = {
  Melee: IconSwords, Hybrid: IconShieldHalf, Healer: IconHeartPlus, Caster: IconWand,
  Good: IconSun, Evil: IconSkull, Chaotic: IconTornado,
};
type GroupName = keyof typeof GROUP_MARK;

interface TileGroup<Id> { name: GroupName; ids: Id[] }
const CLASS_GROUPS: TileGroup<ClassId>[] = [
  { name: "Melee", ids: ["WAR", "MNK", "ROG"] },
  { name: "Hybrid", ids: ["PAL", "SHD", "RNG", "BRD"] },
  { name: "Healer", ids: ["CLR", "DRU", "SHM"] },
  { name: "Caster", ids: ["NEC", "WIZ", "MAG", "ENC"] },
];
// By faction: who can walk into whose cities. Iksar are hated by everyone.
const RACE_GROUPS: TileGroup<RaceId>[] = [
  { name: "Good", ids: ["HUM", "BAR", "ERU", "ELF", "HIE", "HEF", "DWF", "HFL", "GNM"] },
  { name: "Evil", ids: ["DEF", "TRL", "OGR"] },
  { name: "Chaotic", ids: ["IKS"] },
];

function GroupLabel({ name }: { name: GroupName }) {
  const Icon = GROUP_MARK[name];
  return (
    <Group gap={4} justify="center" wrap="nowrap" className={classes.groupName}>
      <Icon size={13} stroke={2} aria-hidden />
      <Text fz="xs" inherit>{name}</Text>
    </Group>
  );
}

// A group much longer than the rest gets two columns of tiles.
const wide = (ids: string[]) => ids.length > 6;

function TileGroups<Id extends string>({ label, names, groups, perRow, value, other, onChange }: {
  label: string;
  names: Record<Id, string>;
  groups: TileGroup<Id>[];
  perRow: number; // categories side by side before wrapping
  value: Id | null;
  other: (id: Id) => boolean;
  onChange: (id: Id | null) => void;
}) {
  const row = groups.slice(0, perRow);
  return (
    <Stack gap={6} role="group" aria-label={label}>
      <Text fz="xs" fw={600} tt="uppercase" c="dimmed" className={classes.heading}>{label}</Text>
      <div className={classes.columns} style={{ gridTemplateColumns: row.map(({ ids }) => (wide(ids) ? "minmax(0, 2fr)" : "minmax(0, 1fr)")).join(" ") }}>
        {groups.map(({ name, ids }, g) => (
          <div key={name} className={`${classes.column} ${classes.group}`} data-row-start={g % perRow === 0 || undefined} data-row-end={g % perRow === perRow - 1 || undefined}>
            <GroupLabel name={name} />
            <div className={classes.column} style={wide(ids) ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } : undefined}>
              {ids.map(id => {
                const on = value === id;
                return (
                  <UnstyledButton
                    key={id}
                    className={classes.tile}
                    data-on={on || undefined}
                    data-dim={!other(id) || undefined}
                    aria-pressed={on}
                    onClick={() => onChange(on ? null : id)}
                  >
                    <OverflowText span inherit display="block">{names[id]}</OverflowText>
                  </UnstyledButton>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Stack>
  );
}

// Every race and class on screen at once, grouped the way players think about them.
// Picking a race narrows the classes; races are never narrowed.
export function CharacterPickerPane({ cls, race, onChange, row }: {
  cls: ClassId | null;
  race: RaceId | null;
  onChange: (p: { cls?: ClassId | null; race?: RaceId | null }) => void;
  row?: boolean;
}) {
  return (
    <div className={row ? classes.row : classes.stack}>
      <TileGroups
        label="Filter by race"
        names={RACE_NAME}
        groups={RACE_GROUPS}
        perRow={3}
        value={race}
        other={() => true}
        onChange={id => onChange(validCombo(cls, id) ? { race: id } : { race: id, cls: null })}
      />
      {/* Stacked, a rule keeps the two sets of tiles apart, as the doll is kept from them. */}
      {!row && <Divider />}
      <TileGroups
        label="Filter by class"
        names={CLASS_NAME}
        groups={CLASS_GROUPS}
        perRow={4}
        value={cls}
        other={id => validCombo(id, race)}
        onChange={id => onChange(validCombo(id, race) ? { cls: id } : { cls: id, race: null })}
      />
    </div>
  );
}
