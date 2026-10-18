import { ActionIcon, Tooltip } from "@mantine/core";
import { IconFilterOff } from "@tabler/icons-react";
import { activeChips, type Filters } from "../../state";

const CLEARED: Partial<Filters> = { cls: null, race: null, kind: "all", slot: null, q: "" };

interface Props {
  f: Filters;
  set: (p: Partial<Filters>) => void;
}

// Always rendered, disabled when there's nothing to clear, so nothing around it moves.
export function ClearFiltersButton({ f, set }: Props) {
  const disabled = !activeChips(f).length && !f.q;
  return (
    <Tooltip label="Clear filters">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Clear filters" disabled={disabled} onClick={() => set(CLEARED)}>
        <IconFilterOff size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
