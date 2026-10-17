import { Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { CLASSES, RACES } from "../data";
import classes from "./CharacterPicker.module.css";

// Classic class/race combinations; anything else can't be rolled.
const CAN_BE: Record<string, string[]> = {
  WAR: ["BAR", "DEF", "DWF", "GNM", "HEF", "HFL", "HUM", "IKS", "OGR", "TRL", "ELF"],
  CLR: ["DEF", "DWF", "ERU", "GNM", "HIE", "HFL", "HUM"],
  PAL: ["DWF", "ERU", "HEF", "HIE", "HFL", "HUM"],
  RNG: ["HEF", "HUM", "ELF"],
  SHD: ["DEF", "ERU", "GNM", "HUM", "IKS", "OGR", "TRL"],
  DRU: ["HEF", "HFL", "HUM", "ELF"],
  MNK: ["HUM", "IKS"],
  BRD: ["HEF", "HUM", "ELF"],
  ROG: ["BAR", "DEF", "DWF", "GNM", "HEF", "HFL", "HUM", "ELF"],
  SHM: ["BAR", "IKS", "OGR", "TRL"],
  NEC: ["DEF", "ERU", "GNM", "HUM", "IKS"],
  WIZ: ["DEF", "ERU", "GNM", "HIE", "HUM"],
  MAG: ["DEF", "ERU", "GNM", "HIE", "HUM"],
  ENC: ["DEF", "ERU", "GNM", "HIE", "HUM"],
};
export const validCombo = (cls: number, race: number) =>
  cls < 0 || race < 0 || CAN_BE[CLASSES[cls][0]].includes(RACES[race][0]);

const CLASS_GROUPS: [string, string[]][] = [
  ["Melee", ["WAR", "MNK", "ROG"]],
  ["Hybrid", ["PAL", "SHD", "RNG", "BRD"]],
  ["Priest", ["CLR", "DRU", "SHM"]],
  ["Caster", ["NEC", "WIZ", "MAG", "ENC"]],
];
const RACE_GROUPS: [string, string[]][] = [
  ["Good", ["HIE", "ELF", "DWF", "HFL"]],
  ["Neutral", ["HUM", "BAR", "ERU", "HEF", "GNM"]],
  ["Evil", ["DEF", "TRL", "OGR", "IKS"]],
];

function TileGroups({ label, list, groups, value, other, onChange }: {
  label: string;
  list: readonly (readonly [string, string])[];
  groups: [string, string[]][];
  value: number;
  other: (i: number) => boolean;
  onChange: (i: number) => void;
}) {
  return (
    <Stack gap={6} role="group" aria-label={label}>
      <Text fz="xs" fw={600} tt="uppercase" c="dimmed" className={classes.heading}>{label}</Text>
      {groups.map(([name, codes]) => (
        <div key={name} className={classes.row}>
          <Text fz="xs" c="dimmed" className={classes.groupName}>{name}</Text>
          <div className={classes.tiles}>
            {codes.map(code => {
              const i = list.findIndex(x => x[0] === code);
              const on = value === i;
              const fits = other(i);
              return (
                <Tooltip key={code} label={list[i][1] + (fits ? "" : " (not with your other pick)")} openDelay={300}>
                  <UnstyledButton
                    className={classes.tile}
                    data-on={on || undefined}
                    data-dim={!fits || undefined}
                    aria-pressed={on}
                    aria-label={list[i][1]}
                    onClick={() => onChange(on ? -1 : i)}
                  >
                    {code}
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
    </Stack>
  );
}

// Every class and race on screen at once, grouped the way players think about them.
export function CharacterPicker({ cls, race, onChange }: { cls: number; race: number; onChange: (p: { cls?: number; race?: number }) => void }) {
  return (
    <Stack gap="sm">
      <TileGroups
        label="Class"
        list={CLASSES}
        groups={CLASS_GROUPS}
        value={cls}
        other={i => validCombo(i, race)}
        onChange={i => onChange(validCombo(i, race) ? { cls: i } : { cls: i, race: -1 })}
      />
      <TileGroups
        label="Race"
        list={RACES}
        groups={RACE_GROUPS}
        value={race}
        other={i => validCombo(cls, i)}
        onChange={i => onChange(validCombo(cls, i) ? { race: i } : { race: i, cls: -1 })}
      />
    </Stack>
  );
}
