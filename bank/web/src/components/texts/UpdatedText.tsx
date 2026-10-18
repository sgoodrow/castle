import { Text, Tooltip } from "@mantine/core";
import { useEffect, useState } from "react";
import { SNAPSHOT_AT } from "../../data";

function ago(from: Date, now: number) {
  const min = Math.max(0, Math.round((now - from.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

// How fresh the page is, with the exact dates on hover.
export function UpdatedText() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <Tooltip label={`Newest inventory upload ${SNAPSHOT_AT.toLocaleString()}`} fz="xs">
      <Text fz="xs" c="dimmed" span style={{ cursor: "default" }}>Updated {ago(SNAPSHOT_AT, now)}</Text>
    </Tooltip>
  );
}
