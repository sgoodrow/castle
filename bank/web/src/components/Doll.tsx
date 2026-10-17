import { Paper, Text, Title, UnstyledButton } from "@mantine/core";
import { DOLL, SLOT_CHIPS, fitsBit, type Item } from "../data";
import classes from "./Doll.module.css";

export const chipForBit = (bit: number) => SLOT_CHIPS.find(([, bits]) => bits.includes(bit))?.[0] ?? null;

// A minimap of the inventory window: it shows where the item under the pointer
// (or the one open in the details pane) is worn, and clicking a slot filters the bank to it.
export function Doll({ item, slot, onSlot }: { item: Item | null; slot: string | null; onSlot: (chip: string | null) => void }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={2} fz="md" mb="sm">Inventory</Title>
      <div className={classes.doll} role="group" aria-label="Filter the bank by slot">
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
              aria-label={`${s.label.toLowerCase()} slot${lit ? `, ${item!.name} fits here` : ""}`}
              onClick={() => onSlot(active ? null : chip)}
            >
              {s.label}
            </UnstyledButton>
          );
        })}
      </div>
      <Text fz="xs" c="dimmed" mt="sm">Highlighted slots show where an item is worn. Click a slot to browse just that slot.</Text>
    </Paper>
  );
}
