import { Box, Button, Container, Drawer, Grid, Group, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconMoneybag } from "@tabler/icons-react";
import { ToastNotification, type ToastMsg } from "../ToastNotification";
import { OverflowTooltip } from "../OverflowTooltip";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ITEMS, bankRequest, usable, type Item } from "../../data";
import { filterItems } from "../../search";
import { getRouteApi } from "@tanstack/react-router";
import { toFilters, toSearch, useTab, type Filters } from "../../state";
import { DetailPane } from "./DetailPane";
import { ItemListPane } from "./ItemListPane";
import { SearchPane } from "./SearchPane";
import { FilterPane } from "./FilterPane";
import { TabPane } from "./TabPane";
import { tabTotal, totalShort, totalText } from "../../tab";
import { UpdatedText } from "../texts/UpdatedText";
import { DevOptionsPane } from "./DevOptionsPane";

const route = getRouteApi("__root__");

export function AppPane() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const f = useMemo(() => toFilters(search), [search]);
  const [tab, setTab] = useTab();
  const [selected, setSelected] = useState<number | null>(null);
  const md = useMediaQuery("(min-width: 62em)", true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tabOpen, setTabOpen] = useState(false);

  const items = useMemo(() => filterItems(f), [f]);
  // Filters change the URL in place, so Back still leaves the page rather than undoing a click.
  const set = (p: Partial<Filters>) => navigate({ search: s => toSearch({ ...toFilters(s), ...p }), replace: true });
  const setQty = (id: number, qty: number) =>
    setTab(t => {
      const next = { ...t };
      if (qty > 0) next[id] = qty; else delete next[id];
      return next;
    });
  const canUse = (it: Item) => usable(it, f);

  // Double-click a row: one more on the tab, a flash on the row, a bump on the pouch and a toast.
  const tabBtn = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const toastTimer = useRef<number>();
  const say = (text: string, ok: boolean) => {
    setToast({ key: Date.now(), text, ok });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };
  const addOne = (it: Item, row: HTMLElement) => {
    if (bankRequest(it, f.cls).text == null) return say(`${it.name} isn't for sale`, false);
    const have = tab[it.id] || 0;
    if (have >= it.total) {
      // Shake the count so it's clear it has hit the ceiling. Transform only, so nothing moves.
      row.querySelector("[role=button]")?.animate(
        [0, -4, 4, -3, 3, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 300, easing: "ease-out" });
      return say(it.total === 1 ? "The bank only has one, and it's on your tab" : `The bank only has ${it.total}, all on your tab`, false);
    }
    setQty(it.id, have + 1);
    say(have ? `${it.name} ×${have + 1} on your tab` : `Added ${it.name} to your tab`, true);
    // Transforms and colour only, so nothing around them moves.
    row.animate([{ background: "var(--mantine-primary-color-light)" }, { background: "transparent" }], { duration: 600, easing: "ease-out" });
    tabBtn.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
  };
  const removeOne = (it: Item) => {
    const have = tab[it.id] || 0;
    if (!have) return; // never below zero
    setQty(it.id, have - 1);
    say(have > 1 ? `${it.name} ×${have - 1} on your tab` : `Removed ${it.name} from your tab`, true);
  };
  // The URL can name an item the bank no longer has.
  const sel = (selected != null && ITEMS[selected]) || null;
  const shown = sel;

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
    <DetailPane
      it={shown}
      canUse={!shown || canUse(shown)}
      onBack={md ? undefined : () => select(null)}
      onClose={md ? () => select(null) : undefined}
    />
  );
  const sticky = { position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto" } as const;
  const total = tabTotal(tab, f.cls);
  const list = <ItemListPane items={items} selected={selected} tab={tab} cls={f.cls} canUse={canUse} onSelect={select} onAdd={addOne} onRemove={removeOne} table={md} sort={f.sort} onSort={sort => set({ sort })} />;

  return (
    <Container size={1500} py="md" px={{ base: "md", sm: "lg" }}>
      <Group gap="sm" justify="space-between" wrap="nowrap" mb="sm">
        <Group gap="sm" align="baseline" style={{ minWidth: 0 }}>
          <Title order={1} fz="h2">Castle Guild Bank</Title>
          <UpdatedText />
        </Group>
        {/* The tab: a coin pouch with the bill so far. Fixed width so a growing bill never moves anything. */}
        <Button ref={tabBtn} variant="light" h={36} px={6} w={md ? 140 : 120} style={{ flex: "none" }} aria-label={`Show tab, ${totalText(total)}`} onClick={() => setTabOpen(true)}
          leftSection={<IconMoneybag size={20} />} styles={{ inner: { justifyContent: "stretch" }, label: { flex: 1 }, section: { marginInlineEnd: 6 } }}>
          <Text span fw={700} fz="sm" px={6} py={2} w="100%" ta="right" style={{ fontVariantNumeric: "tabular-nums", borderRadius: 4, background: "var(--mantine-color-body)", color: "light-dark(#5f6b76, #dde3e9)" }}>
            {totalShort(total)}
          </Text>
        </Button>
      </Group>
      {!md && <Box mb="sm"><SearchPane f={f} set={set} onFilters={() => setFiltersOpen(true)} /></Box>}
      {md ? (
        <>
          <Box mb="md"><FilterPane f={f} set={set} minimap={sel} bar search={<SearchPane f={f} set={set} />} /></Box>
          <Grid gutter="md">
            <Grid.Col span={8}>{list}</Grid.Col>
            <Grid.Col span={4}><div style={sticky}>{detail}</div></Grid.Col>
          </Grid>
        </>
      ) : sel ? detail : list}
      <ToastNotification msg={toast} />
      <OverflowTooltip />
      <Drawer opened={tabOpen} onClose={() => setTabOpen(false)} position="right" size="min(440px, 100%)" title="Your tab" withinPortal>
        <TabPane tab={tab} cls={f.cls} onSelect={id => { setTabOpen(false); select(id); }} onRemove={id => setQty(id, 0)} onClear={() => setTab({})} />
      </Drawer>
      {!md && (
        <Drawer opened={filtersOpen} onClose={() => setFiltersOpen(false)} position="left" size="min(400px, 100%)" title="Filters" withinPortal>
          <FilterPane f={f} set={set} minimap={sel} bare />
        </Drawer>
      )}
      {import.meta.env.DEV && <DevOptionsPane />}
    </Container>
  );
}
