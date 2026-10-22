import { Group, Stack, Text } from "@mantine/core";
import type { JewelryItem } from "../../data";
import { useDevOption } from "../../devOptions";

// What a piece of jewelry costs the guild to make, and how bringing your own materials works. The
// recipe itself is the wiki's, linked from the item's name.
export function JewelryPane({ it }: { it: JewelryItem }) {
  const look = useDevOption("jewelryDetails");
  const { materials, success, note } = it.jewelry;
  return (
    <Stack gap={6}>
      {look === "breakdown" && (
        <Stack gap={2} fz="sm">
          {materials.map(m => (
            <Group key={m.what} justify="space-between" wrap="nowrap">
              <Text span c="dimmed" inherit>{m.what}</Text>
              <Text span inherit style={{ fontVariantNumeric: "tabular-nums" }}>{m.pp.toLocaleString()}pp</Text>
            </Group>
          ))}
          <Group justify="space-between" wrap="nowrap">
            <Text span c="dimmed" inherit>Success rate</Text>
            <Text span inherit style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(success * 100)}%</Text>
          </Group>
        </Stack>
      )}
      {note && <Text fz="sm" fw={600}>{note}</Text>}
      <Text fz="sm" c="dimmed">Bring your own materials and pay only for the ones the guild provides. A failed combine is on you.</Text>
    </Stack>
  );
}
