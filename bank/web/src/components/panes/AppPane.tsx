import { ActionIcon, Box, Button, Container, Drawer, Grid, Group, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconMoneybag } from "@tabler/icons-react";
import { ToastNotification, type ToastMsg } from "../ToastNotification";
import { OverflowTooltip } from "../OverflowTooltip";
import { useMemo, useRef, useState } from "react";
import { ITEMS, MAX_TAB_ITEMS, tabLimit, usable, type Item } from "../../data";
import { filterItems } from "../../search";
import { getRouteApi } from "@tanstack/react-router";
import { toFilters, toSearch, useTab, type Filters } from "../../state";
import { DetailPane } from "./DetailPane";
import { ItemListPane } from "./ItemListPane";
import { SearchPane } from "./SearchPane";
import { FilterPane } from "./FilterPane";
import { TabPane } from "./TabPane";
import { tabTotal, totalShort, totalText } from "../../tab";
import { channelName } from "../../request";
import { UpdatedText } from "../texts/UpdatedText";
import { DevOptionsPane } from "./DevOptionsPane";
import { ClearFiltersButton } from "../buttons/ClearFiltersButton";
import { ClearTabButton } from "../buttons/ClearTabButton";

const route = getRouteApi("__root__");

export function AppPane() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const f = useMemo(() => toFilters(search), [search]);
  const [tab, setTab] = useTab();
  const md = useMediaQuery("(min-width: 62em)", true);
  const sm = useMediaQuery("(min-width: 48em)", true); // tablets and up get the table
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tabOpen, setTabOpen] = useState(false);
  const [sending, setSending] = useState(false); // a tab post is in flight
  // The tab stays open while a post is in flight, so its send state isn't unmounted mid-send.
  const closeTab = () => { if (!sending) setTabOpen(false); };

  const items = useMemo(() => filterItems(f), [f]);
  // Filters change the URL in place, so Back still leaves the page rather than undoing a click.
  const set = (p: Partial<Filters>) => navigate({ search: s => ({ ...toSearch({ ...toFilters(s), ...p }), item: s.item }), replace: true });
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
    const have = tab[it.id] || 0;
    if (!have && Object.keys(tab).length >= MAX_TAB_ITEMS) return say(`Up to ${MAX_TAB_ITEMS} different items per request`, false);
    const max = tabLimit(it);
    if (have >= max) {
      // Shake the count so it's clear it has hit the ceiling. Transform only, so nothing moves.
      row.querySelector("[data-qty]")?.animate(
        [0, -4, 4, -3, 3, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 300, easing: "ease-out" });
      if (it.jewelry) return say(`Up to ${max} ${it.name} per request`, false);
      if (max < it.total) return say(`One DKP auction at a time for ${it.name}`, false);
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
  // The open item lives in the URL. The URL can name an item the bank no longer has.
  const selected = search.item ?? null;
  const sel = (selected != null && ITEMS[selected]) || null;
  const shown = sel;

  // Wide screens swap details in place. Smaller ones open them over the list as a step in history,
  // so Back (or a swipe) closes them.
  const pushed = useRef(false);
  const select = (id: number | null) => {
    if (id == null && pushed.current) {
      pushed.current = false;
      return history.back();
    }
    const push = !md && id != null && selected == null;
    if (push) pushed.current = true;
    // The router scrolls to the top on every navigation, which would lose the member's place in the list.
    navigate({ search: s => ({ ...s, item: id ?? undefined }), replace: !push, resetScroll: false });
  };
  // Kept while the drawer slides shut, so it doesn't empty as it goes.
  const [drawerItem, setDrawerItem] = useState(sel);
  if (sel && sel !== drawerItem) setDrawerItem(sel);

  const detail = (
    <DetailPane
      it={shown}
      canUse={!shown || canUse(shown)}
      cls={f.cls}
      qty={shown ? tab[shown.id] || 0 : 0}
      onAdd={addOne}
      onRemove={removeOne}
      onClose={() => select(null)}
    />
  );
  const sticky = { position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto" } as const;
  const total = tabTotal(tab, f.cls);
  const closeFilters = () => setFiltersOpen(false);
  const list = <ItemListPane items={items} selected={selected} tab={tab} cls={f.cls} canUse={canUse} onSelect={select} onAdd={addOne} onRemove={removeOne} table={sm} sort={f.sort} onSort={sort => set({ sort })} />;

  return (
    <Container size={1500} py="md" px={{ base: "md", sm: "lg" }}>
      <Group gap="sm" justify="space-between" wrap="nowrap" mb="sm">
        <Group gap="sm" align="baseline" style={{ minWidth: 0 }}>
          <Title order={1} fz="h2">Castle Guild Bank</Title>
          <UpdatedText />
        </Group>
        {/* The tab: a coin pouch with the bill so far. Fixed width so a growing bill never moves anything. */}
        <Button ref={tabBtn} variant="light" h={36} px={6} w={md ? 140 : 120} style={{ flex: "none" }} aria-label={`Show tab, ${totalText(total)}`} onClick={() => setTabOpen(true)}
          leftSection={<IconMoneybag size={20} />} styles={{ inner: { justifyContent: "stretch" }, label: { flex: 1, minWidth: 0 }, section: { marginInlineEnd: 6 } }}>
          <Text span truncate="end" display="block" fw={700} fz="sm" px={6} py={2} w="100%" ta="right" title={totalShort(total)} style={{ fontVariantNumeric: "tabular-nums", borderRadius: 4, background: "var(--mantine-color-body)", color: "light-dark(#5f6b76, #dde3e9)" }}>
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
      ) : list}
      <ToastNotification msg={toast} />
      <OverflowTooltip />
      <Drawer opened={tabOpen} onClose={closeTab} position="right" size="min(440px, 100%)" withinPortal withCloseButton={false} styles={{ title: { flex: 1 } }}
        title={
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <ActionIcon variant="subtle" color="gray" aria-label="Back to the bank" onClick={closeTab}><IconArrowLeft size={18} /></ActionIcon>
              Your tab
            </Group>
            <ClearTabButton empty={!Object.keys(tab).length} onClear={() => setTab({})} />
          </Group>
        }>
        <TabPane tab={tab} cls={f.cls} onSelect={id => { closeTab(); select(id); }} onRemove={id => setQty(id, 0)}
          onSent={chans => { setTab({}); setTabOpen(false); say(`Posted to ${chans.map(channelName).join(" and ")}`, true); }}
          sending={sending} onSending={setSending} />
      </Drawer>
      {!md && (
        <Drawer opened={!!sel} onClose={() => select(null)} position="right" size="min(440px, 100%)" withinPortal withCloseButton={false} styles={{ title: { flex: 1 } }}
          title={
            <Group gap="xs" wrap="nowrap">
              <ActionIcon variant="subtle" color="gray" aria-label="Back to the list" onClick={() => select(null)}><IconArrowLeft size={18} /></ActionIcon>
              Details
            </Group>
          }>
          {drawerItem && <DetailPane it={drawerItem} canUse={canUse(drawerItem)} cls={f.cls} qty={tab[drawerItem.id] || 0} onAdd={addOne} onRemove={removeOne} bare />}
        </Drawer>
      )}
      {!md && (
        <Drawer opened={filtersOpen} onClose={closeFilters} position="left" size="min(400px, 100%)" withinPortal withCloseButton={false} styles={{ title: { flex: 1 } }}
          title={
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <ActionIcon variant="subtle" color="gray" aria-label="Back to the bank" onClick={closeFilters}><IconArrowLeft size={18} /></ActionIcon>
                Filters
              </Group>
              <ClearFiltersButton f={f} set={set} />
            </Group>
          }>
          <FilterPane f={f} set={set} minimap={sel} bare />
        </Drawer>
      )}
      {import.meta.env.DEV && <DevOptionsPane />}
    </Container>
  );
}
