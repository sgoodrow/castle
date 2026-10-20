import { Group, Paper, Text, Title } from "@mantine/core";
import { forwardRef, type ReactNode } from "react";

interface Props {
  tint: "price" | "auction";
  title: string; // "Guild price" or "DKP auction"
  icon?: ReactNode; // before the title
  action: ReactNode; // what puts it on the tab, beside the title
  children: ReactNode; // what it costs, or a line on what happens
}

// How to get an item, as a tinted card with slots like Mantine's sections:
//   <BuyCardPane tint="price" title="Guild price" action={<BuyPane … />}>250pp</BuyCardPane>
// Every kind looks the same but for its tint: green for a price, yellow for a DKP auction.
export const BuyCardPane = forwardRef<HTMLDivElement, Props>(function BuyCardPane({ tint: kind, title, icon, action, children }, ref) {
  const tint = kind === "auction" ? "yellow" : "green";
  return (
    <Paper ref={ref} role="group" aria-label="On your tab" withBorder p="xs" radius="md"
      style={{ background: `var(--mantine-color-${tint}-light)`, borderColor: `var(--mantine-color-${tint}-outline)`, boxShadow: "none" }}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={4} wrap="nowrap" c={`var(--mantine-color-${tint}-light-color)`}>
          {icon}
          <Title order={3} fz="xs" tt="uppercase" c="inherit" style={{ letterSpacing: "0.06em" }}>{title}</Title>
        </Group>
        {action}
      </Group>
      <Text fz="sm" fw={700}>{children}</Text>
    </Paper>
  );
});
