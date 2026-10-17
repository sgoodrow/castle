import { Box } from "@mantine/core";
import { iconUrl, type Item } from "../data";

export function ItemIcon({ it, size = 40 }: { it: Item; size?: number }) {
  const src = iconUrl(it);
  return src ? (
    <img src={src} alt="" width={size} height={size} style={{ flex: "none", imageRendering: "pixelated", borderRadius: 4 }} />
  ) : (
    <Box w={size} h={size} bg="var(--mantine-color-default-hover)" style={{ flex: "none", borderRadius: 4 }} />
  );
}
