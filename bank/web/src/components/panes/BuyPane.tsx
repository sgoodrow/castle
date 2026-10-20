import { ActionIcon, Group, Text } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { tabLimit, type Item } from "../../data";

interface Props {
  it: Item;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}

// Inside the row's button, so these are spans acting as buttons, and a click never selects the row.
const act = (f: () => void) => ({
  role: "button",
  tabIndex: 0,
  onClick: (e: MouseEvent) => { e.stopPropagation(); f(); },
  onDoubleClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    f();
  },
});

// How many of an item are on the tab, with a plus and a minus to change it.
export function BuyPane({ it, qty, onAdd, onRemove }: Props) {
  // Out of the most allowed, so it's clear when there are no more to add.
  const max = tabLimit(it);
  const count = max > 1 ? `${qty}/${max}` : `${qty}`;
  const plus = (
    <ActionIcon component="span" size="sm" variant="light" color="gray" aria-label={`Add one ${it.name} to your tab`} {...act(onAdd)}>
      <IconPlus size={14} stroke={2.5} />
    </ActionIcon>
  );
  const minus = (
    <ActionIcon component="span" size="sm" variant="light" color="gray" aria-label={`Remove one ${it.name} from your tab`} {...act(onRemove)}>
      <IconMinus size={14} stroke={2.5} />
    </ActionIcon>
  );

  // Space is always held so adding to the tab never reflows the row.
  return (
    <Group gap={2} wrap="nowrap">
      <span style={{ visibility: qty ? "visible" : "hidden" }}>{minus}</span>
      <Text span fz="xs" fw={700} ta="center" miw={22} data-qty style={{ fontVariantNumeric: "tabular-nums", visibility: qty ? "visible" : "hidden" }}>{count}</Text>
      {plus}
    </Group>
  );
}
