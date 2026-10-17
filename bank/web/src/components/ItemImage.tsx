import { Box } from "@mantine/core";
import { useState } from "react";
import { iconUrl, type Item } from "../data";

// The item's wiki icon, or a plain tile of the same size while the server hasn't fetched it yet.
export function ItemImage({ it, size = 40 }: { it: Item; size?: number }) {
  const src = iconUrl(it);
  const [failed, setFailed] = useState<string | null>(null);
  return src && failed !== src ? (
    <img src={src} alt="" width={size} height={size} onError={() => setFailed(src)} style={{ flex: "none", imageRendering: "pixelated", borderRadius: 4 }} />
  ) : (
    <Box w={size} h={size} bg="var(--mantine-color-default-hover)" style={{ flex: "none", borderRadius: 4 }} />
  );
}
