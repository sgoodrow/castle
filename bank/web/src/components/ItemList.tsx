import { Badge, Group, HoverCard, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { statParts, whereText, type Item } from "../data";
import type { Tab } from "../state";
import { ItemIcon } from "./ItemIcon";
import { StatBlock } from "./StatBlock";
import classes from "./ItemList.module.css";

export function PriceBadge({ it }: { it: Item }) {
  const a = it.auc;
  if (!a.hasTracker) return null;
  if (a.level === "none" || a.median == null) return <Badge color="gray" variant="light" title="No Green auction listings in the last 6 months">no sales</Badge>;
  return (
    <Badge color={a.level === "solid" ? "green" : "yellow"} variant="light" title={`Green median over 6 months, ${a.recent.length} listings from ${a.sellers.size} sellers`}>
      {a.median}pp
    </Badge>
  );
}

interface Props {
  items: Item[];
  total: number;
  selected: number | null;
  tab: Tab;
  canUse: (it: Item) => boolean;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
}

// Bank rows keep the in-game item-link look: icon, name, stat line, where it sits.
export function ItemList({ items, total, selected, tab, canUse, onSelect, onHover }: Props) {
  const canHover = useMediaQuery("(hover: hover)") ?? false;
  return (
    <Paper withBorder radius="md">
      <Group justify="space-between" p="md" pb="xs">
        <Title order={2} fz="md">Bank</Title>
        <Text fz="sm" c="dimmed">{items.length === total ? `${total} items` : `${items.length} of ${total} items`}</Text>
      </Group>
      {items.length === 0 && <Text p="md" c="dimmed">Nothing in the bank matches. Try clearing a filter.</Text>}
      <Stack gap={0} component="ul" className={classes.list} onMouseLeave={() => onHover(null)}>
        {items.map(it => (
          <li key={it.id}>
            <HoverCard disabled={!canHover} openDelay={250} closeDelay={0} position="right-start" width={340} shadow="md" withinPortal>
              <HoverCard.Target>
                <UnstyledButton
                  className={classes.row}
                  data-selected={selected === it.id || undefined}
                  data-unusable={!canUse(it) || undefined}
                  aria-current={selected === it.id || undefined}
                  onClick={() => onSelect(it.id)}
                  onMouseEnter={() => onHover(it.id)}
                  onFocus={() => onHover(it.id)}
                >
                  <ItemIcon it={it} />
                  <div className={classes.body}>
                    <Group gap={6} wrap="wrap">
                      <Text fw={600} fz="sm" className={classes.name}>{it.name}</Text>
                      {it.nodrop && <Badge size="xs" variant="outline" color="gray">NO DROP</Badge>}
                      {it.lore && <Badge size="xs" variant="outline" color="gray">LORE</Badge>}
                    </Group>
                    <Text fz="xs" className={classes.stats}>
                      {statParts(it).map((p, i) => (
                        <span key={i}>{p.label && <span className={classes.k}>{p.label} </span>}{p.value}</span>
                      ))}
                    </Text>
                    <Text fz="xs" c="dimmed" lineClamp={1}>{whereText(it.holders)}</Text>
                  </div>
                  <Stack gap={4} align="flex-end" className={classes.side}>
                    <PriceBadge it={it} />
                    {/* Space is always held so adding to the tab never reflows the row. */}
                    <Badge size="sm" variant="filled" style={{ visibility: tab[it.id] ? "visible" : "hidden" }}>In tab{tab[it.id] > 1 ? ` ×${tab[it.id]}` : ""}</Badge>
                    {!canUse(it) && <Text fz="xs" c="red">can't use</Text>}
                  </Stack>
                </UnstyledButton>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <StatBlock it={it} />
              </HoverCard.Dropdown>
            </HoverCard>
          </li>
        ))}
      </Stack>
    </Paper>
  );
}
