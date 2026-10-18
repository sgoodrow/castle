import { ActionIcon, Button, Code, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { OverflowText } from "../texts/OverflowText";
import { IconCheck, IconCopy, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { ITEMS, bankRequest, type ClassId, type Item } from "../../data";
import { tabTotal, totalText } from "../../tab";
import type { Tab } from "../../state";
import { ItemImage } from "../ItemImage";

interface Props {
  tab: Tab;
  cls: ClassId | null;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}


type Line = { it: Item; qty: number; pp: number | null };
// The tab as a plain-text table, for pasting into Discord as a code block.
function tabTable(lines: Line[]) {
  // Known prices still add up when some lines need a banker's quote.
  const sum = lines.reduce((t, l) => t + (l.pp ?? 0) * l.qty, 0);
  const grand = lines.some(l => l.pp == null) ? (sum ? `${sum} + ask` : "ask") : String(sum);
  const columns: { head: string; right?: boolean; cell: (l: Line) => string; foot: string }[] = [
    { head: "Item", cell: l => l.it.name, foot: "GRAND TOTAL" },
    { head: "Location", cell: l => l.it.holders[0].char, foot: "" },
    { head: "Count", right: true, cell: l => String(l.qty), foot: "" },
    { head: "Each", right: true, cell: l => (l.pp == null ? "ask" : String(l.pp)), foot: "" },
    { head: "Total", right: true, cell: l => (l.pp == null ? "ask" : String(l.pp * l.qty)), foot: grand },
  ];
  const sized = columns.map(c => ({ ...c, width: Math.max(c.head.length, c.foot.length, ...lines.map(l => c.cell(l).length)) }));
  const fmt = (text: (c: (typeof sized)[number]) => string) =>
    sized.map(c => (c.right ? text(c).padStart(c.width) : text(c).padEnd(c.width))).join(" | ").trimEnd();
  const rule = sized.map(c => "-".repeat(c.width)).join("-|-");
  return [fmt(c => c.head), rule, ...lines.map(l => fmt(c => c.cell(l))), rule, fmt(c => c.foot)].join("\n");
}

// The running tab: every request line ready to paste into #bank-requests, with a total.
export function TabPane({ tab, cls, onSelect, onRemove, onClear }: Props) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  // Ids the bank no longer shows (sold, or NO DROP) are skipped.
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    return it ? [{ it, qty, req: bankRequest(it, cls, qty) }] : [];
  });
  const total = tabTotal(tab, cls);
  const quotes = lines.filter(l => l.req.pp == null).length;
  const dkp = lines.filter(l => l.req.dkp).length;
  const text = lines.length ? tabTable(lines.map(l => ({ it: l.it, qty: l.qty, pp: l.req.pp }))) : "";

  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    navigator.clipboard?.writeText("```\n" + text + "\n```").then(done, () => {
      // Clipboard refused: select the text so Ctrl/Cmd+C works.
      if (!codeRef.current) return;
      const r = document.createRange();
      r.selectNodeContents(codeRef.current);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    });
  };

  return (
    <div>
      {lines.length === 0 ? (
        <Text fz="sm" c="dimmed">Nothing yet. Open an item and choose Add to tab.</Text>
      ) : (
        <Stack gap="sm">
          <Stack gap={4} component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lines.map(({ it, qty, req }) => (
              <Group key={it.id} component="li" gap="xs" wrap="nowrap">
                <UnstyledButton onClick={() => onSelect(it.id)} style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <ItemImage it={it} size={28} />
                  <OverflowText fz="sm">{qty > 1 ? `${qty} × ` : ""}{it.name}</OverflowText>
                </UnstyledButton>
                <Text fz="sm" c={req.pp == null ? "dimmed" : undefined} style={{ flex: "none" }}>
                  {req.pp == null ? "ask" : req.pp === 0 ? "free" : `${req.pp * qty}pp`}
                </Text>
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`Remove ${it.name}`} onClick={() => onRemove(it.id)}>
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
          <Group justify="space-between" fw={600}>
            <Text fw={600}>Total</Text>
            <Text fw={600}>{totalText(total)}</Text>
          </Group>
          {(quotes > 0 || dkp > 0) && (
            <Text fz="xs" c="dimmed">
              {quotes > 0 && `${quotes} item${quotes === 1 ? " needs" : "s need"} a price from a banker. `}
              {dkp > 0 && `Level 55+ spells can be paid with 1 DKP each instead.`}
            </Text>
          )}
          {text && (
            <>
              <Code block ref={codeRef} fz="xs" style={{ whiteSpace: "pre", overflowX: "auto" }}>{text}</Code>
              <Button fullWidth leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />} color={copied ? "green" : undefined} onClick={copy}>
                {copied ? "Copied" : "Copy request"}
              </Button>
              <Text fz="xs" c="dimmed">Paste it in #bank-requests and say how long you'll be online.</Text>
              <Button variant="subtle" color="gray" onClick={onClear}>Clear tab</Button>
            </>
          )}
        </Stack>
      )}
    </div>
  );
}
