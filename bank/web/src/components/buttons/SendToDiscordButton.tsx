import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconBrandDiscordFilled } from "@tabler/icons-react";
import { useState } from "react";
import type { RequestMessage } from "../../request";
import { DiscordMessagePane } from "../panes/DiscordMessagePane";

// What to tell the member when the site doesn't post it.
const failure = (status: number | null) =>
  status === 401 ? "Your sign-in has run out. Reload the page to sign in again."
  : status === 429 ? "That's a lot of requests. Try again in a few minutes."
  : "Couldn't post it. Try again in a moment.";

// Posts the tab's messages, one per channel, once confirmed in a modal that shows each post itself.
export function SendToDiscordButton({ msgs, onSent }: { msgs: RequestMessage[]; onSent: (channels: RequestMessage["channel"][]) => void }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The posts that have gone through for this tab, so a retry picks up at the first one that didn't.
  // Kept across cancelling, and only for the same messages: a changed tab starts again from the top.
  const [progress, setProgress] = useState<{ key: string; done: number } | null>(null);
  const close = () => { setOpen(false); setError(null); };
  const send = async () => {
    setSending(true);
    setError(null);
    // In order, and stopping at the first that fails, so a post that went through is never repeated.
    const key = JSON.stringify(msgs);
    let done = progress?.key === key ? progress.done : 0;
    let status: number | null = 204;
    for (let i = done; i < msgs.length; i++) {
      status = await fetch("/api/bank-request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgs[i]),
      }).then(r => r.status, () => null);
      if (status !== 204) break;
      done = i + 1;
      setProgress({ key, done });
    }
    setSending(false);
    if (status === 204) { setProgress(null); close(); onSent(msgs.map(m => m.channel)); } else setError(failure(status));
  };
  return (
    <>
      <Button fullWidth color="#5865f2" leftSection={<IconBrandDiscordFilled size={18} />} onClick={() => setOpen(true)}>
        Send to Discord
      </Button>
      <Modal opened={open} onClose={close} size={520} centered styles={{ body: { paddingBottom: 0 } }} title={<Text fw={600}>Post these?</Text>}>
        <Stack gap="sm">
          {msgs.map(msg => <DiscordMessagePane key={msg.channel} msg={msg} />)}
          {/* Stuck to the bottom of the modal as the post scrolls, so the choice is always in view. */}
          <Stack gap="xs" py="sm" style={{ position: "sticky", bottom: 0, background: "var(--mantine-color-body)", borderTop: "1px solid var(--mantine-color-default-border)" }}>
            {error && <Text fz="sm" c="red" role="alert">{error}</Text>}
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button color="#5865f2" loading={sending} leftSection={<IconBrandDiscordFilled size={16} />} onClick={() => void send()}>Send</Button>
            </Group>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
}
