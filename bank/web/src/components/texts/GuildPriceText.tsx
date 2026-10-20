import { Badge, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { bankRequest, type ClassId, type Item } from "../../data";

// What the guild charges, as plain text. A price from thin market data gets a quiet warning mark,
// and a spell that only goes to DKP auction gets a gold badge.
export function GuildPriceText({ it, cls }: { it: Item; cls: ClassId | null }) {
  const req = bankRequest(it, cls);
  const { price } = req;
  switch (price.kind) {
    case "ask": return null;
    case "auction": return <Badge size="xs" px={5} variant="light" color="yellow" tt="none" style={{ flex: "none", overflow: "visible" }}>DKP</Badge>;
    case "free": return <Text span fz="xs" fw={600}>free</Text>;
    case "pp": {
      const thin = price.fromMarket && it.auc.level === "thin";
      const text = (
        <Text span fz="xs" fw={600} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", cursor: thin ? "help" : undefined }}>
          {thin && <IconAlertTriangle size={12} stroke={1.75} aria-label="Low confidence" style={{ display: "block", color: "var(--mantine-color-dimmed)" }} />}
          {price.pp}pp
        </Text>
      );
      return thin ? <Tooltip label="Low confidence">{text}</Tooltip> : text;
    }
  }
}
