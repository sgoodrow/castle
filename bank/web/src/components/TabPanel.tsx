import { ActionIcon, Button, Code, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { TextWithOverflow } from "./TextWithOverflow";
import { IconCheck, IconCopy, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { ITEMS, bankRequest } from "../data";
import type { Tab } from "../state";
import { ItemIcon } from "./ItemIcon";

interface Props {
  tab: Tab;
  cls: number;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}

// What the tab adds up to, in platinum; null if anything on it has no known price.
export function tabTotal(tab: Tab, cls: number): number | null {
  let sum = 0;
  for (const [id, qty] of Object.entries(tab)) {
    const it = ITEMS[+id];
    if (!it) continue; // no longer in the bank
    const pp = bankRequest(it, cls, qty).pp;
    if (pp == null) return null;
    sum += pp * qty;
  }
  return sum;
}
export const totalText = (t: number | null) => (t == null ? "???" : `${t.toLocaleString()}pp`);

// The running tab: every request line ready to paste into #bank-requests, with a total.
export function TabPanel({ tab, cls, onSelect, onRemove, onClear }: Props) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  // Ids the bank no longer shows (sold, or NO DROP) are skipped.
  const lines = Object.entries(tab).filter(([id]) => ITEMS[+id]).map(([id, qty]) => ({ it: ITEMS[+id], qty, req: bankRequest(ITEMS[+id], cls, qty) }));
  const total = tabTotal(tab, cls);
  const quotes = lines.filter(l => l.req.pp == null).length;
  const dkp = lines.filter(l => l.req.dkp).length;
  const text = lines.map(l => l.req.text).filter(Boolean).join("\n");

  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    navigator.clipboard?.writeText(text).then(done, () => {
      // Clipboard refused: select the text so Ctrl/Cmd+C works.
      const r = document.createRange();
      r.selectNodeContents(codeRef.current!);
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
                  <ItemIcon it={it} size={28} />
                  <TextWithOverflow fz="sm">{qty > 1 ? `${qty} × ` : ""}{it.name}</TextWithOverflow>
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
              <Code block ref={codeRef} fz="xs" style={{ whiteSpace: "pre-wrap" }}>{text}</Code>
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
