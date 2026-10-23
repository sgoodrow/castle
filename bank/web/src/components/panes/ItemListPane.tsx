import { Badge, Text, Tooltip, UnstyledButton, Group } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconDiamond } from "@tabler/icons-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { memo, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { BuyPane } from "./BuyPane";
import { statParts, type ClassId, type Item } from "../../data";
import { nextSort, sortDesc, sortKey, type Sort, type SortKey, type Tab } from "../../state";
import { GuildPriceText } from "../texts/GuildPriceText";
import { ItemImage } from "../ItemImage";
import { CollapsibleLayout } from "../CollapsibleLayout";
import { OverflowText } from "../texts/OverflowText";
import classes from "./ItemListPane.module.css";


interface Props {
  items: Item[];
  selected: number | null;
  tab: Tab;
  cls: ClassId | null;
  canUse: (it: Item) => boolean;
  onSelect: (id: number) => void;
  onAdd?: (it: Item, row: HTMLElement) => void; // double-click: one more on the tab
  onRemove?: (it: Item) => void; // click the tab count: one fewer
  table?: boolean; // one line per item with a stats column; phones put the stats under the name
  sort: Sort;
  onSort: (sort: Sort) => void;
}

// A column header that sorts the list; clicking it again flips the direction.
function SortHeader({ k, sort, onSort, className, tip, children }: { k: SortKey; sort: Sort; onSort: (s: Sort) => void; className?: string; tip?: string; children: React.ReactNode }) {
  const on = sortKey(sort) === k;
  const Arrow = sortDesc(sort) ? IconArrowDown : IconArrowUp;
  return (
    <span className={className} aria-sort={on ? (sortDesc(sort) ? "descending" : "ascending") : "none"}>
      <Tooltip label={tip} disabled={!tip}>
        <UnstyledButton className={classes.sort} data-active={on || undefined} onClick={() => onSort(nextSort(sort, k))}>
          {children}
          <Arrow size={12} stroke={2.5} style={{ visibility: on ? "visible" : "hidden" }} />
        </UnstyledButton>
      </Tooltip>
    </span>
  );
}

const stats = (it: Item) =>
  statParts(it).map((p, i) => <span key={i}>{p.label && <span className={classes.k}>{p.label} </span>}{p.value}</span>);

interface RowProps {
  it: Item;
  selected: boolean;
  usable: boolean;
  qty: number;
  table?: boolean;
  cls: ClassId | null;
  on: { current: Pick<Props, "onSelect" | "onAdd" | "onRemove"> };
  index: number;
  start: number; // px from the top of the list
  measure: (el: Element | null) => void;
}

// One item. Memoized: selecting or filtering only re-renders the rows that changed.
const Row = memo(function Row({ it, selected, usable, qty, table, cls, on, index, start, measure }: RowProps) {
  const btn = useRef<HTMLButtonElement>(null);
  const madeBadge = !!it.jewelry && it.holders.length === 0;
  return (
    <li ref={measure} data-index={index} className={classes.item} style={{ transform: `translateY(${start}px)` }}>
      <UnstyledButton
        ref={btn}
        className={classes.row}
        data-selected={selected || undefined}
        data-unusable={!usable || undefined}
        aria-current={selected || undefined}
        onClick={() => on.current.onSelect(it.id)}
        onDoubleClick={e => on.current.onAdd?.(it, e.currentTarget)}
      >
        <span className={classes.icon}><ItemImage it={it} size={table ? 24 : 28} /></span>
        <Group gap={6} wrap="nowrap" className={classes.name}>
          {it.lore && <Badge size="xs" variant="outline" color="gray" style={{ flex: "none" }}>LORE</Badge>}
          <OverflowText fw={600} fz="sm" className={classes.nameText}>{it.name}</OverflowText>
          {madeBadge && <IconDiamond size={14} stroke={1.75} aria-label="Made to order" style={{ flex: "none", color: "var(--mantine-color-dimmed)" }} />}
          {!usable && <Badge size="xs" variant="outline" color="red" style={{ flex: "none" }}>CAN'T USE</Badge>}
        </Group>
        <OverflowText fz="xs" className={classes.stats}>{stats(it)}</OverflowText>
        <span className={classes.price}><GuildPriceText it={it} cls={cls} /></span>
        <span className={`${classes.tab} ${classes.end}`}>
          <BuyPane it={it} qty={qty}
            onAdd={() => btn.current && on.current.onAdd?.(it, btn.current)}
            onRemove={() => on.current.onRemove?.(it)} />
        </span>
      </UnstyledButton>
    </li>
  );
});

// The bank as a table: icon, name, stat line, price, tab.
export function ItemListPane({ items, selected, tab, cls, canUse, onSelect, onAdd, onRemove, table, sort, onSort }: Props) {
  // Handlers go through a ref so rows never see a new function and stay memoized.
  const on = useRef({ onSelect, onAdd, onRemove });
  useLayoutEffect(() => {
    on.current = { onSelect, onAdd, onRemove };
  });

  // Only the rows on screen are rendered, but the list keeps its full height,
  // so the page scrollbar still reflects every item.
  const listRef = useRef<HTMLUListElement>(null);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const read = () => setOffset(el.getBoundingClientRect().top + window.scrollY);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);
  const v = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => (table ? 30 : 59), // the rows' real heights, so measuring them moves nothing
    overscan: 12,
    scrollMargin: offset,
    getItemKey: i => items[i]?.id ?? i,
  });
  // Up and down move the selection, and the details follow. The new row is scrolled into view and
  // takes the focus, so holding a key walks the list.
  const step = (e: KeyboardEvent<HTMLUListElement>) => {
    const by = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const at = items.findIndex(it => it.id === selected);
    const i = Math.min(items.length - 1, Math.max(0, at + by));
    const next = items[i];
    if (!next) return;
    onSelect(next.id);
    v.scrollToIndex(i, { align: "auto" });
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"] > button`)?.focus({ preventScroll: true }));
  };
  return (
    <CollapsibleLayout id="items" title="Items Available" className={classes.root} data-table={table || undefined}
      actions={<Text fz="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{items.length} {items.length === 1 ? "item" : "items"}</Text>}>
      <div className={`${classes.row} ${classes.head}`}>
        <span className={classes.icon} />
        <SortHeader k="name" sort={sort} onSort={onSort} className={classes.name}>Item</SortHeader>
        {table && <span className={classes.stats}>Stats</span>}
        <SortHeader k="price" sort={sort} onSort={onSort} className={classes.price} tip="80% of market price. Unknown prices sort as 0.">
          {table ? "Guild price" : "Price"}
        </SortHeader>
        <span className={`${classes.tab} ${classes.end}`}>Buy</span>
      </div>
      {items.length === 0 && <Text p="md" c="dimmed">Nothing in the bank matches. Try clearing a filter.</Text>}
      <ul ref={listRef} aria-label="Items in the bank" onKeyDown={step} className={classes.list} style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map(r => {
          const it = items[r.index];
          // The virtualizer only hands out indexes below count, so a miss is our bug: say so, don't hide it.
          if (!it) throw new Error(`Virtualizer row ${r.index} is past the ${items.length} items`);
          return (
            <Row key={it.id} it={it} selected={selected === it.id} usable={canUse(it)} qty={tab[it.id] || 0} table={table} cls={cls} on={on}
              index={r.index} start={r.start - offset} measure={v.measureElement} />
          );
        })}
      </ul>
    </CollapsibleLayout>
  );
}
