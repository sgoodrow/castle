import { Button } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

interface Props {
  empty: boolean;
  onClear: () => void;
}

// Always rendered, disabled when the tab is empty, so nothing around it moves.
export function ClearTabButton({ empty, onClear }: Props) {
  return (
    <Button size="compact-sm" variant="light" color="red" leftSection={<IconTrash size={14} />} disabled={empty} onClick={onClear} aria-label="Clear tab">
      Clear
    </Button>
  );
}
