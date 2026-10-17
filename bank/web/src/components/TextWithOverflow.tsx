import { Portal, Text, type TextProps } from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";

// One shared tooltip for every truncated text on the page. Rows stay cheap:
// nothing is measured or mounted until the pointer actually lands on one.
type Tip = { label: ReactNode; x: number; y: number } | null;
let show: (t: Tip) => void = () => {};

export function OverflowTooltip() {
  const [tip, setTip] = useState<Tip>(null);
  useEffect(() => {
    show = setTip;
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

export function TextWithOverflow({ children, label, ...props }: TextProps & { children: ReactNode; label?: ReactNode }) {
  return (
    <Text
      truncate="end"
      {...props}
      onMouseEnter={e => {
        const el = e.currentTarget;
        if (el.scrollWidth <= el.clientWidth) return;
        const r = el.getBoundingClientRect();
        show({ label: label ?? children, x: Math.max(216, Math.min(window.innerWidth - 216, r.left + r.width / 2)), y: r.top });
      }}
      onMouseLeave={() => show(null)}
    >
      {children}
    </Text>
  );
}
