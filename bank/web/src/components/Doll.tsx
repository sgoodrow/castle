import { Stack, Text, UnstyledButton } from "@mantine/core";
import { DOLL, SLOT_CHIPS, fitsBit, type Item } from "../data";
import classes from "./Doll.module.css";

export const chipForBit = (bit: number) => SLOT_CHIPS.find(([, bits]) => bits.includes(bit))?.[0] ?? null;

// The inventory window as a slot picker. It also lights up where the item
// under the pointer (or the one open in details) is worn.
export function Doll({ item, slot, onSlot }: { item: Item | null; slot: string | null; onSlot: (chip: string | null) => void }) {
  return (
    <Stack gap={6}>
      <Text fz="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>Slot</Text>
      <div className={classes.doll} role="group" aria-label="Slot">
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
              {s.label}
            </UnstyledButton>
          );
        })}
      </div>
    </Stack>
  );
}
