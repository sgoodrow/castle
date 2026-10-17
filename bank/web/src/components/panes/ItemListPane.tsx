import { Badge, Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle, IconMinus } from "@tabler/icons-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { bankRequest, statParts, type ClassId, type Item } from "../../data";
import type { Tab } from "../../state";
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
  table?: boolean; // one line per item in columns; phones get stacked rows
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
  return (
    <li ref={measure} data-index={index} className={classes.item} style={{ transform: `translateY(${start}px)` }}>
      <UnstyledButton
        className={classes.row}
        data-selected={selected || undefined}
        data-unusable={!usable || undefined}
        aria-current={selected || undefined}
        onClick={() => on.current.onSelect(it.id)}
        onDoubleClick={e => on.current.onAdd?.(it, e.currentTarget)}
      >
        <span className={classes.icon}><ItemImage it={it} size={table ? 24 : 32} /></span>
        <Group gap={6} wrap="nowrap" className={classes.name}>
          {it.lore && <Badge size="xs" variant="outline" color="gray" style={{ flex: "none" }}>LORE</Badge>}
          <OverflowText fw={600} fz="sm" className={classes.nameText}>{it.name}</OverflowText>
          {!usable && <Badge size="xs" variant="outline" color="red" style={{ flex: "none" }}>CAN'T USE</Badge>}
        </Group>
        {table
          ? <OverflowText fz="xs" className={classes.stats}>{stats(it)}</OverflowText>
          : <Text fz="xs" className={`${classes.stats} ${classes.wrap}`}>{stats(it)}</Text>}
        <span className={`${classes.price} ${classes.end}`}><GuildPriceText it={it} cls={cls} /></span>
        {/* Space is always held so adding to the tab never reflows the row. */}
        <span className={`${classes.tab} ${classes.end}`}>
          {/* Clicking it takes one off; on hover it turns into a minus so that's clear. */}
          <Badge size="sm" variant="filled" className={classes.qty} role="button" aria-label={`Remove one ${it.name} from your tab`}
            style={{ visibility: qty ? "visible" : "hidden" }}
            onClick={e => { e.stopPropagation(); on.current.onRemove?.(it); }}
            onDoubleClick={e => e.stopPropagation()}>
            <IconMinus size={10} stroke={3} className={classes.minus} />
            {/* Out of the bank's count, so it's clear when there are no more to add. */}
            {table ? (it.total > 1 ? `${qty}/${it.total}` : qty) : `In tab ${qty}/${it.total}`}
          </Badge>
        </span>
      </UnstyledButton>
    </li>
  );
});

// The bank as a table: icon, name, stat line, price, tab.
export function ItemListPane({ items, selected, tab, cls, canUse, onSelect, onAdd, onRemove, table }: Props) {
  // Handlers go through a ref so rows never see a new function and stay memoized.
  const on = useRef({ onSelect, onAdd, onRemove });
  on.current = { onSelect, onAdd, onRemove };

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
    estimateSize: () => (table ? 31 : 64),
    overscan: 12,
    scrollMargin: offset,
    getItemKey: i => items[i]?.id ?? i,
  });
  return (
    <CollapsibleLayout id="items" title="Items Available" className={classes.root} data-table={table || undefined}
      actions={<Text fz="sm" c="dimmed">{items.length} {items.length === 1 ? "item" : "items"}</Text>}>
      {table && (
        <div className={`${classes.row} ${classes.head}`} aria-hidden>
          <span />
          <span>Item</span>
          <span>Stats</span>
          <Tooltip label="80% of market price"><span className={classes.end} style={{ cursor: "help" }}>Guild price</span></Tooltip>
          <span className={classes.end}>Buy</span>
        </div>
      )}
      {items.length === 0 && <Text p="md" c="dimmed">Nothing in the bank matches. Try clearing a filter.</Text>}
      <ul ref={listRef} className={classes.list} style={{ height: v.getTotalSize() }}>
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
