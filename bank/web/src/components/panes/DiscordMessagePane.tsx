import { Group, Stack, Text } from "@mantine/core";
import { Fragment } from "react";
import { ITEMS, ME } from "../../data";
import type { RequestMessage } from "../../request";
import { ItemImage } from "../ItemImage";

// Discord's own dark theme, so the preview looks like the post it stands for.
const D = { bg: "#313338", embed: "#2b2d31", text: "#dbdee1", muted: "#949ba4", name: "#f2f3f5", link: "#00a8fc" };
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

// The little markdown the bot uses: **bold**, `-# ` subtext and line breaks.
const bold = (s: string) => s.split(/\*\*(.+?)\*\*/).map((part, j) => (j % 2 ? <b key={j} style={{ color: D.name }}>{part}</b> : part));
const md = (s: string) => s.split("\n").map((line, i) => (
  <Fragment key={i}>
    {i > 0 && <br />}
    {line.startsWith("-# ") ? <span style={{ color: D.muted, fontSize: "0.85em" }}>{bold(line.slice(3))}</span> : bold(line)}
  </Fragment>
));

// The site titles the request with whoever sent it, linked to their Discord profile.
const requestTitle = () => `@${ME} has placed a bank request`;

// A look at the #bank-requests post before it's sent.
export function DiscordMessagePane({ msg }: { msg: RequestMessage }) {
  return (
    <Stack gap={6} p="sm" style={{ background: D.bg, borderRadius: 8, color: D.text, fontSize: 14 }}>
      <Group gap={6}>
        <Text fw={600} fz="sm" c={D.name}>Castle</Text>
        <Text fz={10} fw={600} px={4} style={{ background: "#5865f2", color: "white", borderRadius: 3 }}>APP</Text>
        <Text fz="xs" c={D.muted}>#bank-requests</Text>
      </Group>
      {msg.embeds.map((e, i) => {
        const it = e.item != null ? ITEMS[e.item] : undefined;
        return (
          <Group key={i} align="flex-start" wrap="nowrap" gap="sm" p="xs" pl="sm"
            style={{ background: D.embed, borderLeft: `4px solid ${hex(e.color)}`, borderRadius: 4 }}>
            <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
              <Text fw={600} fz="sm" c={i === 0 ? D.link : D.name}>{i === 0 ? requestTitle() : e.title}</Text>
              <Text fz="xs" c={D.text} style={{ overflowWrap: "anywhere" }}>{md(e.description)}</Text>
              {e.footer && <Text fz={11} c={D.muted}>{e.footer}</Text>}
            </Stack>
            {it && <ItemImage it={it} size={32} />}
          </Group>
        );
      })}
    </Stack>
  );
}
