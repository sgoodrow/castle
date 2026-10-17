import { Box, Container, Drawer, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useMemo, useState } from "react";
import { BUILT, ITEMS, ITEM_LIST, RESISTS, SLOT_CHIPS, SNAPSHOT, STATS, sumOf, statText, usable, type Item } from "./data";
import { useSaved, type Filters } from "./state";
import { DetailPane } from "./components/DetailPane";
import { Doll } from "./components/Doll";
import { ItemList } from "./components/ItemList";
import { SearchPanel } from "./components/SearchPanel";
import { TabPanel } from "./components/TabPanel";

const SORT_KEY: Record<string, (it: Item) => number | string> = {
  name: it => it.name,
  ac: it => -(it.ac || 0),
  hp: it => -(it.hp || 0),
  mana: it => -(it.mana || 0),
  stats: it => -sumOf(it, STATS),
  resists: it => -sumOf(it, RESISTS),
  price: it => -(it.auc.level !== "none" ? it.auc.median ?? -1 : -1),
  sellers: it => -it.auc.sellers.size,
  count: it => -it.total,
};

function filterItems(f: Filters) {
  const bits = f.slot ? SLOT_CHIPS.find(([l]) => l === f.slot)![1] : null;
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const char = { cls: f.cls, race: f.race };
  const onlyUsable = f.usableOnly && (f.cls >= 0 || f.race >= 0);
  const key = SORT_KEY[f.sort] ?? SORT_KEY.name;
  return ITEM_LIST.filter(it => {
    if (f.kind !== "all" && it.kind !== f.kind) return false;
    if (bits && !bits.some(b => (it.slots || 0) & (1 << b))) return false;
    if (f.banker && !it.holders.some(h => h.char === f.banker)) return false;
    if (onlyUsable && (it.kind === "gear" || it.kind === "spell") && !usable(it, char)) return false;
    if (terms.length) {
      const hay = (it.name + " " + statText(it)).toLowerCase();
      if (!terms.every(t => hay.includes(t))) return false;
    }
    return true;
  }).sort((a, b) => {
    const x = key(a), y = key(b);
    return x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
  });
}

export default function App() {
  const [{ f, tab }, setSaved] = useSaved();
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const wide = useMediaQuery("(min-width: 75em)", true);

  const items = useMemo(() => filterItems(f), [f]);
  const set = (p: Partial<Filters>) => setSaved(s => ({ ...s, f: { ...s.f, ...p } }));
  const setQty = (id: number, qty: number) =>
    setSaved(s => {
      const next = { ...s.tab };
      if (qty > 0) next[id] = qty; else delete next[id];
      return { ...s, tab: next };
    });
  const canUse = (it: Item) => usable(it, f);
  const sel = selected != null ? ITEMS[selected] : null;
  const minimap = hovered != null ? ITEMS[hovered] : sel;

  const detail = (
    <DetailPane it={sel} cls={f.cls} banker={f.banker} inTab={sel ? tab[sel.id] || 0 : 0} canUse={!sel || canUse(sel)} onSetQty={q => sel && setQty(sel.id, q)} />
  );
  const sticky = { position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto" } as const;

  return (
    <Container size={1500} py="md" px={{ base: "md", sm: "lg" }}>
      <Group justify="space-between" align="baseline" mb="md" gap="xs">
        <Title order={1} fz="h3">Castle Guild Bank</Title>
        <Text fz="sm" c="dimmed">Bank snapshot {SNAPSHOT} · prices as of {BUILT}</Text>
      </Group>
      <Grid gutter="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }} order={{ base: 2, md: 1 }}>
          <Stack gap="md" style={wide ? sticky : undefined}>
            <Doll item={minimap} slot={f.slot} onSlot={slot => set({ slot })} />
            <TabPanel tab={tab} cls={f.cls} banker={f.banker} onSelect={setSelected} onRemove={id => setQty(id, 0)} onClear={() => setSaved(s => ({ ...s, tab: {} }))} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8, lg: 5 }} order={{ base: 1, md: 2 }}>
          <Stack gap="md">
            <SearchPanel f={f} set={set} />
            <ItemList items={items} total={ITEM_LIST.length} selected={selected} tab={tab} canUse={canUse} onSelect={setSelected} onHover={setHovered} />
          </Stack>
        </Grid.Col>
        {wide && (
          <Grid.Col span={4} order={3}>
            <Box style={sticky}>{detail}</Box>
          </Grid.Col>
        )}
      </Grid>
      {!wide && (
        <Drawer opened={sel != null} onClose={() => setSelected(null)} position="right" size="min(480px, 100%)" aria-label={sel?.name ?? "Item details"} withinPortal styles={{ header: { minHeight: 0, paddingBottom: 0 } }}>
          {detail}
        </Drawer>
      )}
    </Container>
  );
}
