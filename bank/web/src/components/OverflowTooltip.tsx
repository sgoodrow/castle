import { Portal } from "@mantine/core";
import { useEffect, useState } from "react";
import { onTip, type Tip } from "../overflowTip";

// The floating label for truncated text; mounted once at the top of the page.
export function OverflowTooltip() {
  const [tip, setTip] = useState<Tip>(null);
  useEffect(() => {
    onTip(setTip);
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);
  if (!tip) return null;
  return (
    <Portal>
      <div role="tooltip" className="overflow-tip" style={{
        position: "fixed", left: tip.x, top: tip.y, translate: "-50% calc(-100% - 6px)", zIndex: 500, pointerEvents: "none",
        maxWidth: 420, background: "#000", color: "#fff", padding: "2px 6px", borderRadius: "var(--mantine-radius-sm)",
        fontSize: "var(--mantine-font-size-xs)", lineHeight: 1.35,
      }}>{tip.label}</div>
    </Portal>
  );
}
