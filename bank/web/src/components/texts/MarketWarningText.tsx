import { Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { Item } from "../../data";

const WARNING = { thin: "Thin data", none: "No sales in 6 months" } as const;

// Shown beside the Market data heading only when the market can't be trusted; a steady one says nothing.
export function MarketWarningText({ it }: { it: Item }) {
  const a = it.auc;
  if (!a.hasTracker || !a.rows.length || a.level === "solid") return null;
  return (
    <Tooltip label="Low confidence">
      <Text fz="xs" c="dimmed" style={{ display: "inline-flex", alignItems: "center", gap: 3, cursor: "help" }}>
        <IconAlertTriangle size={12} stroke={1.75} />{WARNING[a.level]}
      </Text>
    </Tooltip>
  );
}
