import { ActionIcon, Anchor, Divider, Group, Stack, Text } from "@mantine/core";
import { OverflowText } from "../texts/OverflowText";
import { IconTrash } from "@tabler/icons-react";
import { ITEMS, bankRequest, type ClassId } from "../../data";
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
    return it ? [{ it, qty, req: bankRequest(it, cls, qty) }] : [];
  });
  const total = tabTotal(tab, cls);
  const dkp = lines.filter(l => l.req.dkp).length;
  const msg = requestMessage(tab, cls);

  return (
    <div>
      {lines.length === 0 ? (
        <Text fz="sm" c="dimmed">Nothing yet. Open an item and choose Add to tab.</Text>
      ) : (
        <Stack gap="sm">
          <Stack gap={4} component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lines.map(({ it, qty, req }) => (
              <Group key={it.id} component="li" gap="xs" wrap="nowrap">
                {/* A link, since it opens the item's details. */}
                <Anchor component="button" underline="always" onClick={() => onSelect(it.id)} style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0, textAlign: "left" }}>
                  <ItemImage it={it} size={28} />
                  <OverflowText fz="sm" style={{ color: "inherit" }}>{qty > 1 ? `${qty} × ` : ""}{it.name}</OverflowText>
                </Anchor>
                <Text fz="sm" c={req.pp == null ? "dimmed" : undefined} style={{ flex: "none" }}>
                  {req.pp == null ? "unknown" : req.pp === 0 ? "free" : `${req.pp * qty}pp`}
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
          {dkp > 0 && (
            <Text fz="xs" c="dimmed">
              Level 55+ spells can be paid with 1 DKP each instead.
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
