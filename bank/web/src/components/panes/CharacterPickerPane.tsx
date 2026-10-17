import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconHeartPlus, IconShieldHalf, IconSkull, IconSun, IconSwords, IconTornado, IconWand } from "@tabler/icons-react";
import { CLASSES, RACES, validCombo } from "../../data";
import classes from "./CharacterPickerPane.module.css";
import { OverflowText } from "../texts/OverflowText";


const CLASS_GROUPS: [string, string[]][] = [
  ["Melee", ["WAR", "MNK", "ROG"]],
  ["Hybrid", ["PAL", "SHD", "RNG", "BRD"]],
  ["Healer", ["CLR", "DRU", "SHM"]],
  ["Caster", ["NEC", "WIZ", "MAG", "ENC"]],
];
// By faction: who can walk into whose cities. Iksar are hated by everyone.
const RACE_GROUPS: [string, string[]][] = [
  ["Good", ["HUM", "BAR", "ERU", "ELF", "HIE", "HEF", "DWF", "HFL", "GNM"]],
  ["Evil", ["DEF", "TRL", "OGR"]],
  ["Chaotic", ["IKS"]],
];
// A small mark so each category reads at a glance.
const GROUP_MARK: Record<string, typeof IconSun> = {
  Melee: IconSwords, Hybrid: IconShieldHalf, Healer: IconHeartPlus, Caster: IconWand,
  Good: IconSun, Evil: IconSkull, Chaotic: IconTornado,
};

function GroupName({ name }: { name: string }) {
  const Icon = GROUP_MARK[name];
  return (
    <Group gap={4} justify="center" wrap="nowrap" className={classes.groupName}>
      <Icon size={13} stroke={2} aria-hidden />
      <Text fz="xs" inherit>{name}</Text>
    </Group>
  );
}

// A group much longer than the rest gets two columns of tiles.
const wide = (codes: string[]) => codes.length > 6;

function TileGroups({ label, list, groups, perRow, value, other, onChange }: {
  label: string;
  list: readonly (readonly [string, string])[];
  groups: [string, string[]][];
  perRow: number; // categories side by side before wrapping
  value: number;
  other: (i: number) => boolean;
  onChange: (i: number) => void;
}) {
  const row = groups.slice(0, perRow);
  return (
    <Stack gap={6} role="group" aria-label={label}>
      <Text fz="xs" fw={600} tt="uppercase" c="dimmed" className={classes.heading}>{label}</Text>
      <div className={classes.columns} style={{ gridTemplateColumns: row.map(([, c]) => (wide(c) ? "minmax(0, 2fr)" : "minmax(0, 1fr)")).join(" ") }}>
        {groups.map(([name, codes], g) => (
          <div key={name} className={`${classes.column} ${classes.group}`} data-row-start={g % perRow === 0 || undefined} data-row-end={g % perRow === perRow - 1 || undefined}>
            <GroupName name={name} />
            <div className={classes.column} style={wide(codes) ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } : undefined}>
              {codes.map(code => {
                const i = list.findIndex(x => x[0] === code);
                const on = value === i;
                return (
                  <UnstyledButton
                    key={code}
                    className={classes.tile}
                    data-on={on || undefined}
                    data-dim={!other(i) || undefined}
                    aria-pressed={on}
                    onClick={() => onChange(on ? -1 : i)}
                  >
                    <OverflowText span inherit display="block">{list[i][1]}</OverflowText>
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
export function CharacterPickerPane({ cls, race, onChange, row }: { cls: number; race: number; onChange: (p: { cls?: number; race?: number }) => void; row?: boolean }) {
  return (
    <div className={row ? classes.row : classes.stack}>
      <TileGroups
        label="Filter by race"
        list={RACES}
        groups={RACE_GROUPS}
        perRow={3}
        value={race}
        other={() => true}
        onChange={i => onChange(validCombo(cls, i) ? { race: i } : { race: i, cls: -1 })}
      />
      <TileGroups
        label="Filter by class"
        list={CLASSES}
        groups={CLASS_GROUPS}
        perRow={4}
        value={cls}
        other={i => validCombo(i, race)}
        onChange={i => onChange(validCombo(i, race) ? { cls: i } : { cls: i, race: -1 })}
      />
    </div>
  );
}
