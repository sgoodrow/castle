import { Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBackpack, IconBox, IconScript, type Icon } from "@tabler/icons-react";
import { DOLL, chipForBit, fitsBit, type Item } from "../../data";
import type { Filters } from "../../state";
import classes from "./DollPane.module.css";


// The things that aren't worn, in a row under the doll.
const KIND_CELLS: { kind: Filters["kind"]; label: string; icon: Icon }[] = [
  { kind: "spell", label: "Spells", icon: IconScript },
  { kind: "bag", label: "Bags", icon: IconBackpack },
  { kind: "other", label: "Other", icon: IconBox },
];

interface Props {
  item: Item | null;
  slot: string | null;
  kind: Filters["kind"];
  onSlot: (chip: string | null) => void;
  onKind: (kind: Filters["kind"]) => void;
}

// The inventory window as a slot picker, with spells, bags and other things below.
// It also lights up where the item under the pointer is worn.
export function DollPane({ item, slot, kind, onSlot, onKind }: Props) {
  return (
    <Stack gap={6}>
      <Text fz="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>Filter by slot</Text>
      <div className={classes.doll} role="group" aria-label="Filter by slot">
        {DOLL.flat().map((s, i) => {
          if (!s) return <div key={i} />;
          const chip = chipForBit(s.bit);
          const lit = !!item && fitsBit(item, s.bit);
          const active = chip === slot;
          return (
            <UnstyledButton
              key={s.key}
              className={classes.slot}
              data-lit={lit || undefined}
              data-active={active || undefined}
              aria-pressed={active}
              aria-label={`${(chip ?? s.label).toLowerCase()} slot${lit ? `, ${item!.name} fits here` : ""}`}
              onClick={() => onSlot(active ? null : chip)}
            >
              <span className={classes.label}>{s.label}</span>
            </UnstyledButton>
          );
        })}
      </div>
      <div className={classes.kinds} role="group" aria-label="Not worn">
        {KIND_CELLS.map(c => {
          const on = kind === c.kind;
          return (
            <UnstyledButton key={c.kind} className={`${classes.slot} ${classes.kind}`} data-active={on || undefined} aria-pressed={on}
              onClick={() => onKind(on ? "all" : c.kind)}>
              <c.icon size={16} stroke={1.8} aria-hidden />
              {c.label}
            </UnstyledButton>
          );
        })}
      </div>
    </Stack>
  );
}
