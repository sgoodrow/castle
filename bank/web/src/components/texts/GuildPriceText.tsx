import { Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { bankRequest, type Item } from "../../data";

// What the guild charges, as plain text. A price from thin market data gets a quiet warning mark.
export function GuildPriceText({ it, cls }: { it: Item; cls: number }) {
  const req = bankRequest(it, cls);
  if (req.text == null || req.pp == null) return null;
  const thin = req.fromMarket && it.auc.level === "thin";
  const price = (
    <Text span fz="xs" fw={600} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", cursor: thin ? "help" : undefined }}>
      {thin && <IconAlertTriangle size={12} stroke={1.75} aria-label="Low confidence" style={{ display: "block", color: "var(--mantine-color-dimmed)" }} />}
      {req.pp ? `${req.pp}pp` : "free"}
    </Text>
  );
  return thin ? <Tooltip label="Low confidence">{price}</Tooltip> : price;
}
