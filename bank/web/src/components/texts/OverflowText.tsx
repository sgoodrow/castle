import { Text, type TextProps } from "@mantine/core";
import type { ReactNode } from "react";
import { showTip } from "../../overflowTip";

// Text that truncates, with the full text in the shared tooltip when it does.
export function OverflowText({ children, label, ...props }: TextProps & { children: ReactNode; label?: ReactNode }) {
  return (
    <Text
      truncate="end"
      {...props}
      onMouseEnter={e => {
        const el = e.currentTarget;
        if (el.scrollWidth <= el.clientWidth) return;
        const r = el.getBoundingClientRect();
        showTip({ label: label ?? children, x: Math.max(216, Math.min(window.innerWidth - 216, r.left + r.width / 2)), y: r.top });
      }}
      onMouseLeave={() => showTip(null)}
    >
      {children}
    </Text>
  );
}
