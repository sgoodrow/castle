import { Anchor, Box, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  ALL_CLASSES, ALL_RACES, CLASSES, ELEM, RACES, RESISTS, SIZES, SPELLS, STATS, TYPES, WEAPON,
  maskText, signed, slotText, type Item,
} from "../../data";
import { ItemImage } from "../ItemImage";

// A P99 wiki page, marked as leaving the site.
const Wiki = ({ href, children, fw }: { href: string; children: ReactNode; fw?: number }) => (
  <Anchor href={href} target="_blank" rel="noopener" fw={fw} inherit>
    {children}<IconExternalLink size="0.9em" style={{ marginLeft: 3, verticalAlign: "-0.1em" }} />
  </Anchor>
);
const spellWiki = (name: string) => `https://wiki.project1999.com/${encodeURIComponent(name.replace(/ /g, "_"))}`;

const K = ({ children }: { children: ReactNode }) => (
  <Text span c="dimmed" fz="sm">{children}</Text>
);

// The in-game item inspect window, line for line.
export function StatPane({ it, header = true }: { it: Item; header?: boolean }) {
  const flags = [it.magic && "MAGIC ITEM", it.lore && "LORE ITEM", it.nodrop && "NO DROP", it.norent && "NO RENT"].filter(Boolean).join("  ");
  const stats = STATS.filter(([k]) => it[k]).map(([k, l]) => `${l}: ${signed(it[k]!)}`);
  if (it.hp) stats.push(`HP: ${signed(it.hp)}`);
  if (it.mana) stats.push(`MANA: ${signed(it.mana)}`);
  const resists = RESISTS.filter(([k]) => it[k]).map(([k, l]) => `SV ${l}: ${signed(it[k]!)}`);
  const effects = ([["worn", "Worn Effect"], ["proc", "Combat Effect"], ["focus", "Focus Effect"], ["click", "Effect"]] as const)
    .filter(([k]) => it[k] && SPELLS[it[k]!]);
  const sp = it.scroll ? SPELLS[it.scroll] : undefined;
  const gear = !!((it.slots || 0) & ~1);

  return (
    <Stack gap={4} fz="sm">
      {header && (
        <Group gap="sm" wrap="nowrap" mb={4}>
          <ItemImage it={it} />
          <div>
            <Text fw={600}>{it.wiki ? <Wiki href={it.wiki} fw={600}>{it.name}</Wiki> : it.name}</Text>
            {flags && <Text fz="xs" c="dimmed" style={{ whiteSpace: "pre" }}>{flags}</Text>}
          </div>
        </Group>
      )}
      {!header && flags && <Text fz="xs" c="dimmed" style={{ whiteSpace: "pre" }}>{flags}</Text>}
      {gear && <div><K>Slot:</K> {slotText(it)}</div>}
      {WEAPON.has(it.type ?? -1) && !!it.dmg && (
        <>
          <div><K>Skill:</K> {TYPES[it.type!]} &nbsp;<K>Atk Delay:</K> {it.dly}</div>
          <div><K>DMG:</K> {it.dmg}{it.rng ? <> &nbsp;<K>Range:</K> {it.rng}</> : null}</div>
        </>
      )}
      {!!it.elemamt && <div><K>{ELEM[it.elemtype ?? 0] || "Elemental"} DMG:</K> {it.elemamt}</div>}
      {!!it.baneamt && <div><K>Bane DMG:</K> {it.baneamt}</div>}
      {!!it.ac && <div><K>AC:</K> {it.ac}</div>}
      {stats.length > 0 && (
        <Group gap={6} align="flex-start" wrap="nowrap">
          <K>Stats:</K>
          <Pairs items={stats} />
        </Group>
      )}
      {resists.length > 0 && <Pairs items={resists} />}
      {effects.map(([k, l]) => (
        <div key={k}>
          <K>{l}:</K> <Wiki href={spellWiki(SPELLS[it[k]!].name)}>{SPELLS[it[k]!].name}</Wiki>
          {k === "proc" && it.proclvl ? ` (lvl ${it.proclvl})` : ""}
        </div>
      ))}
      {!!it.click && SPELLS[it.click] && (it.charges ?? 0) > 0 && <div><K>Charges:</K> {it.charges}</div>}
      {sp && (
        <div>
          <K>Spell:</K> {sp.name}
          {" · "}{sp.lv.map((l, i) => (l && CLASSES[i] ?`${CLASSES[i][0]}(${l})` : null)).filter(Boolean).join(" ")}
        </div>
      )}
      {!!it.bagslots && (
        <div>
          <K>Capacity:</K> {it.bagslots} &nbsp;<K>Size:</K> {SIZES[it.bagsize ?? 0] || "?"}
          {it.bagwr ? <> &nbsp;<K>Weight Reduction:</K> {it.bagwr}%</> : null}
        </div>
      )}
      <div><K>Weight:</K> {((it.wt || 0) / 10).toFixed(1)} &nbsp;<K>Size:</K> {SIZES[it.size || 0]}</div>
      {(gear || !!it.scroll) && (
        <>
          <div><K>Class:</K> {maskText(it.classes, CLASSES, ALL_CLASSES)}</div>
          <div><K>Race:</K> {maskText(it.races, RACES, ALL_RACES)}</div>
        </>
      )}
      {it.unknown && <Text fz="xs" c="dimmed">This item isn't in the item database (likely P99-specific). Check the wiki for stats.</Text>}
    </Stack>
  );
}

function Pairs({ items }: { items: string[] }) {
  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, max-content))", columnGap: 24 }}>
      {items.map(s => <span key={s}>{s}</span>)}
    </Box>
  );
}
