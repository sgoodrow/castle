import { Anchor } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import type { ReactNode } from "react";

// A P99 wiki page, marked as leaving the site.
export const WikiLinkText = ({ href, children, fw }: { href: string; children: ReactNode; fw?: number }) => (
  <Anchor href={href} target="_blank" rel="noopener" fw={fw} inherit>
    {children}<IconExternalLink size="0.9em" style={{ marginLeft: 3, verticalAlign: "-0.1em" }} />
  </Anchor>
);
