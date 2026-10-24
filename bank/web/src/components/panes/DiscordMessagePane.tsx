import { Group, Stack, Text } from "@mantine/core";
import { Fragment } from "react";
import { ME } from "../../data";
import { channelName, type RequestMessage } from "../../request";

// Discord's own dark theme, so the preview looks like the post it stands for.
const D = { bg: "#313338", embed: "#2b2d31", text: "#dbdee1", muted: "#949ba4", name: "#f2f3f5", link: "#00a8fc" };
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

// The little markdown the bot uses: [links](address), **bold**, `-# ` subtext and line breaks. A backslash
// escapes a markdown character in an item's name, and Discord shows that character without the backslash.
const unescape = (s: string) => s.replace(/\\([\\`*_~|[\]])/g, "$1");
const LINK = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/;
const bold = (s: string) => s.split(/\*\*(.+?)\*\*/).map((part, j) => (j % 2 ? <b key={j} style={{ color: D.name }}>{part}</b> : part));
// Only the pieces the link pattern captured are links; the text between them is never read as one.
const inline = (s: string) => s.split(LINK).map((part, j) => {
  const link = j % 2 ? part.match(/^\[([^\]]+)\]\((.+)\)$/) : null;
  return link ? <a key={j} href={link[2]} target="_blank" rel="noreferrer" style={{ color: D.link }}>{unescape(link[1] ?? "")}</a> : bold(unescape(part));
});
const md = (s: string) => s.split("\n").map((line, i) => (
  <Fragment key={i}>
    {i > 0 && <br />}
    {line.startsWith("-# ") ? <span style={{ color: D.muted, fontSize: "0.85em" }}>{inline(line.slice(3))}</span> : inline(line)}
  </Fragment>
));

// A look at the #bank-requests post before it's sent. The first embed opens with a line naming the
// member, as the bot posts it, with their name linked to their Discord profile.
export function DiscordMessagePane({ msg }: { msg: RequestMessage }) {
  return (
    <Stack gap={6} p="sm" style={{ background: D.bg, borderRadius: 8, color: D.text, fontSize: 14 }}>
      <Group gap={6}>
        <Text fw={600} fz="sm" c={D.name}>Castle</Text>
        <Text fz={10} fw={600} px={4} style={{ background: "#5865f2", color: "white", borderRadius: 3 }}>APP</Text>
        <Text fz="xs" c={D.muted}>{channelName(msg.channel)}</Text>
      </Group>
      {msg.embeds.map((e, i) => (
        <Stack key={i} gap={4} p="xs" pl="sm" style={{ background: D.embed, borderLeft: `4px solid ${hex(e.color)}`, borderRadius: 4 }}>
          {i === 0 && <Text fz="xs" c={D.text}><span style={{ color: D.link }}>@{ME}</span> has placed a bank request.</Text>}
          {e.description && <Text fz="xs" c={D.text} style={{ overflowWrap: "anywhere" }}>{md(e.description)}</Text>}
          {e.fields?.map((f, j) => (
            <Stack key={j} gap={0}>
              <Text fz="xs" c={D.text} style={{ overflowWrap: "anywhere" }}>{md(f.value)}</Text>
            </Stack>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
