import { Group, Stack, Text } from "@mantine/core";
import { Fragment } from "react";
import { ME } from "../../data";
import { channelName, type RequestMessage } from "../../request";
import { requestTitle } from "../../../../../src/shared/bank-request-author";

// Discord's own dark theme, so the preview looks like the post it stands for.
const D = { bg: "#313338", embed: "#2b2d31", text: "#dbdee1", muted: "#949ba4", name: "#f2f3f5", link: "#00a8fc" };
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

// The little markdown the bot uses: [links](address), **bold**, `-# ` subtext and line breaks. A
// backslash escapes a markdown character in an item's name, and Discord shows it without the backslash.
const unescape = (s: string) => s.replace(/\\([\\`*_~|[\]])/g, "$1");
const LINK = /(\[(?:\\.|[^\]\\])+\]\(https?:\/\/[^)\s]+\))/;
const bold = (s: string) => s.split(/\*\*(.+?)\*\*/).map((part, j) => (j % 2 ? <b key={j} style={{ color: D.name }}>{part}</b> : unescape(part)));
// Only the pieces the link pattern captured are links; the text between them is never read as one.
const inline = (s: string) => s.split(LINK).map((part, j) => {
  const link = j % 2 ? part.match(/^\[(.+)\]\((.+)\)$/) : null;
  return link ? <a key={j} href={link[2]} target="_blank" rel="noreferrer" style={{ color: D.link }}>{unescape(link[1] ?? "")}</a> : <Fragment key={j}>{bold(part)}</Fragment>;
});
const md = (s: string) => s.split("\n").map((line, i) => (
  <Fragment key={i}>
    {i > 0 && <br />}
    {line.startsWith("-# ") ? <span style={{ color: D.muted, fontSize: "0.85em" }}>{inline(line.slice(3))}</span> : inline(line)}
  </Fragment>
));

// A look at the post before it's sent, as the bot will post it: titled with the member's name,
// linked to their Discord profile. The post's "DM me the plan" button is for bankers, so it isn't shown.
export function DiscordMessagePane({ msg }: { msg: RequestMessage }) {
  const [e] = msg.embeds;
  return (
    <Stack gap={6} p="sm" style={{ background: D.bg, borderRadius: 8, color: D.text, fontSize: 14 }}>
      <Group gap={6}>
        <Text fw={600} fz="sm" c={D.name}>Castle</Text>
        <Text fz={10} fw={600} px={4} style={{ background: "#5865f2", color: "white", borderRadius: 3 }}>APP</Text>
        <Text fz="xs" c={D.muted}>{channelName(msg.channel)}</Text>
      </Group>
      <Stack gap={4} p="xs" pl="sm" style={{ background: D.embed, borderLeft: `4px solid ${hex(e.color)}`, borderRadius: 4 }}>
        <Text fw={600} fz="sm" c={D.link}>{requestTitle(ME)}</Text>
        <Text fz="xs" c={D.text} style={{ overflowWrap: "anywhere" }}>{md(e.description)}</Text>
        {/* Discord gives each field a name line, even the blank one an item's field has. */}
        {e.fields?.map((f, j) => (
          <Stack key={j} gap={0}>
            <Text fz="xs" fw={600} c={D.name} style={{ minHeight: "1.2em" }}>{f.name}</Text>
            <Text fz="xs" c={D.text} style={{ overflowWrap: "anywhere" }}>{md(f.value)}</Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
