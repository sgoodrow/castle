import { Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBook2, IconDiamond, IconWind, type Icon } from "@tabler/icons-react";
import { DOLL, chipForBit, fitsBit, type Item, type SlotChip } from "../../data";
import type { Filters } from "../../state";
import classes from "./DollPane.module.css";


// The things that aren't worn, and the Plane of Sky mules' stock, which is kept and priced apart,
// in a row under the doll.
type KindCell = "spell" | "sky" | "other";
const KIND_CELLS: { kind: KindCell; label: string; icon: Icon }[] = [
  { kind: "spell", label: "Spells", icon: IconBook2 },
  { kind: "sky", label: "Sky", icon: IconWind },
  { kind: "other", label: "Other", icon: IconDiamond },
];
interface Props {
  item: Item | null;
  slot: SlotChip | null;
  kind: Filters["kind"];
  onSlot: (chip: SlotChip | null) => void;
  onKind: (kind: Filters["kind"]) => void;
}

// The inventory window as a slot picker, with spells, Plane of Sky and other things below.
// It also lights up where the item under the pointer is worn.
export function DollPane({ item, slot, kind, onSlot, onKind }: Props) {
  return (
    <Stack gap={6}>
      <Text fz="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>Filter by slot</Text>
      <div className={classes.doll} role="group" aria-label="Filter by slot">
        {DOLL.flat().map((s, i) => {
          if (!s) return <div key={i} />;
          const chip = chipForBit(s.bit);
          const fits = item && fitsBit(item, s.bit) ? item : null;
          const lit = !!fits;
          const active = chip === slot;
          return (
            <UnstyledButton
              key={s.key}
              className={classes.slot}
              data-lit={lit || undefined}
              data-active={active || undefined}
              aria-pressed={active}
              aria-label={`${(chip ?? s.label).toLowerCase()} slot${fits ? `, ${fits.name} fits here` : ""}`}
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
          const KindIcon = c.icon;
          return (
            <UnstyledButton key={c.kind} className={`${classes.slot} ${classes.kind}`} data-active={on || undefined} aria-pressed={on}
              onClick={() => onKind(on ? "all" : c.kind)}>
              <KindIcon size={16} stroke={1.8} aria-hidden />
              {c.label}
            </UnstyledButton>
          );
        })}
      </div>
    </Stack>
  );
}
