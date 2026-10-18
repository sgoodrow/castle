import { ActionIcon, Anchor, Divider, Group, Stack, Text } from "@mantine/core";
import { OverflowText } from "../texts/OverflowText";
import { IconTrash } from "@tabler/icons-react";
import { ITEMS, bankRequest, priceText, type ClassId } from "../../data";
import { tabTotal, totalText } from "../../tab";
import type { Tab } from "../../state";
import { ItemImage } from "../ItemImage";
import { requestMessage } from "../../request";
import { SendToDiscordButton } from "../buttons/SendToDiscordButton";

interface Props {
  tab: Tab;
  cls: ClassId | null;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  onSent: () => void;
}

// The running tab: what's on it, what it costs, and one button to post it to #bank-requests.
export function TabPane({ tab, cls, onSelect, onRemove, onSent }: Props) {
  // Ids the bank no longer shows (sold, or NO DROP) are skipped.
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    const req = it && bankRequest(it, cls, qty);
    return it && req?.text != null ? [{ it, qty, price: req.price }] : []; // what isn't for sale can't be on it
  });
  const total = tabTotal(tab, cls);
  const dkp = lines.some(l => l.price.kind === "pp" && l.price.dkp);
  const auction = lines.some(l => l.price.kind === "auction");
  const msg = requestMessage(tab, cls);

  return (
    <div>
      {lines.length === 0 ? (
        <Text fz="sm" c="dimmed">Nothing yet. Double-click an item, or use its + button.</Text>
      ) : (
        <Stack gap="sm">
          <Stack gap={4} component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lines.map(({ it, qty, price }) => (
              <Group key={it.id} component="li" gap="xs" wrap="nowrap">
                {/* A link, since it opens the item's details. */}
                <Anchor component="button" underline="always" onClick={() => onSelect(it.id)} style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0, textAlign: "left" }}>
                  <ItemImage it={it} size={28} />
                  <OverflowText fz="sm" style={{ color: "inherit" }}>{qty > 1 ? `${qty} × ` : ""}{it.name}</OverflowText>
                </Anchor>
                <Text fz="sm" c={price.kind === "ask" ? "dimmed" : price.kind === "auction" ? "yellow" : undefined} style={{ flex: "none" }}>
                  {priceText(price, qty)}
                </Text>
                <ActionIcon variant="subtle" color="red" size="sm" aria-label={`Remove ${it.name}`} onClick={() => onRemove(it.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
          <Group justify="space-between" fw={600}>
            <Text fw={600}>Total</Text>
            <Text fw={600}>{totalText(total)}</Text>
          </Group>
          {dkp && (
            <Text fz="xs" c="dimmed">
              Some spells can be paid with 1 DKP each instead.
            </Text>
          )}
          {auction && (
            <Text fz="xs" c="dimmed">
              A banker starts a DKP auction for each auction item.
            </Text>
          )}
          {msg && (
            <>
              <Divider />
              <SendToDiscordButton msg={msg} onSent={onSent} />
            </>
          )}
        </Stack>
      )}
    </div>
  );
}
