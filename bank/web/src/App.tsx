import { Badge, Box, Button, Container, Drawer, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconReceipt } from "@tabler/icons-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BUILT, ITEMS, ITEM_LIST, RESISTS, SLOT_CHIPS, SNAPSHOT, STATS, sumOf, statText, usable, type Item } from "./data";
import { useSaved, type Filters } from "./state";
import { DetailPane } from "./components/DetailPane";
import { ItemList } from "./components/ItemList";
import { SearchBar } from "./components/SearchBar";
import { FilterPanel } from "./components/FilterPanel";
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
  const md = useMediaQuery("(min-width: 62em)", true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tabOpen, setTabOpen] = useState(false);

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

  // Phones show details in place of the list; remember where the list was.
  const listScroll = useRef(0);
  const select = (id: number | null) => {
    if (!md) {
      if (id != null && selected == null) listScroll.current = window.scrollY;
      pendingScroll.current = id != null ? 0 : listScroll.current;
    }
    setSelected(id);
  };
  const pendingScroll = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (pendingScroll.current == null) return;
    window.scrollTo(0, pendingScroll.current);
    pendingScroll.current = null;
  }, [selected]);

  const detail = (
    <DetailPane it={sel} cls={f.cls} banker={f.banker} inTab={sel ? tab[sel.id] || 0 : 0} canUse={!sel || canUse(sel)} onSetQty={q => sel && setQty(sel.id, q)} onBack={md ? undefined : () => select(null)} />
  );
  const sticky = { position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto" } as const;
  const tabCount = Object.values(tab).reduce((n, q) => n + q, 0);

  return (
    <Container size={1500} py="md" px={{ base: "md", sm: "lg" }}>
      <Group justify="space-between" align="center" mb="md" gap="xs" wrap="nowrap">
        <div>
          <Title order={1} fz="h3">Castle Guild Bank</Title>
          <Text fz="xs" c="dimmed">Bank snapshot {SNAPSHOT} · prices as of {BUILT}</Text>
        </div>
        <Button variant="default" style={{ flex: "none" }} aria-label="Show tab" leftSection={<IconReceipt size={18} />} onClick={() => setTabOpen(true)}
          rightSection={<Badge variant={tabCount ? "filled" : "light"} color={tabCount ? undefined : "gray"} miw={28} style={{ fontVariantNumeric: "tabular-nums" }}>{tabCount}</Badge>}>
          Tab
        </Button>
      </Group>
      <Box mb="md">
        <SearchBar f={f} set={set} onFilters={md ? undefined : () => setFiltersOpen(true)} />
      </Box>
      {md ? (
        <Grid gutter="md" align="flex-start">
          <Grid.Col span={{ md: 4, lg: 3 }}>
            <div style={sticky}><FilterPanel f={f} set={set} minimap={minimap} /></div>
          </Grid.Col>
          <Grid.Col span={{ md: 4, lg: 5 }}>
            <ItemList items={items} total={ITEM_LIST.length} selected={selected} tab={tab} canUse={canUse} onSelect={select} onHover={setHovered} />
          </Grid.Col>
          <Grid.Col span={4}>
            <div style={sticky}>{detail}</div>
          </Grid.Col>
        </Grid>
      ) : sel ? detail : (
        <ItemList items={items} total={ITEM_LIST.length} selected={selected} tab={tab} canUse={canUse} onSelect={select} onHover={setHovered} />
      )}
      <Drawer opened={tabOpen} onClose={() => setTabOpen(false)} position="right" size="min(440px, 100%)" title="Your tab" withinPortal>
        <TabPanel tab={tab} cls={f.cls} banker={f.banker} onSelect={id => { setTabOpen(false); select(id); }} onRemove={id => setQty(id, 0)} onClear={() => setSaved(s => ({ ...s, tab: {} }))} />
      </Drawer>
      {!md && (
        <Drawer opened={filtersOpen} onClose={() => setFiltersOpen(false)} position="left" size="min(400px, 100%)" title="Filters" withinPortal>
          <FilterPanel f={f} set={set} minimap={minimap} bare />
        </Drawer>
      )}
    </Container>
  );
}
