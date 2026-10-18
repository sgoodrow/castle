import { ActionIcon, Button, Group, Popover, Stack, Text } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { useState } from "react";
import { OPTIONS, load, pickDevOption } from "../../devOptions";

// Dev only: a corner button opening the candidate looks listed in devOptions.ts.
export function DevOptionsPane() {
  const [v, setV] = useState(load);
  if (!OPTIONS.length) return null;
  const pick = (k: string, x: string) => {
    const next = { ...v, [k]: x };
    setV(next);
    pickDevOption(next);
  };
  // Above drawers and their overlays, so looks can be switched with a drawer open.
  return (
    <Popover position="top-end" shadow="md" zIndex={400} withinPortal>
      <Popover.Target>
        <ActionIcon size="lg" radius="xl" variant="default" aria-label="Dev options" style={{ position: "fixed", right: 12, bottom: 12, zIndex: 400 }}>
          <IconAdjustments size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Stack gap={4}>
          {OPTIONS.map(o => (
            <Group key={o.key} gap={4} wrap="nowrap">
              <Text fz="xs" c="dimmed" w={80}>{o.label}</Text>
              {o.values.map(x => (
                <Button key={x} size="compact-xs" variant={(v[o.key] ?? o.values[0]) === x ? "filled" : "default"} onClick={() => pick(o.key, x)}>{x}</Button>
              ))}
            </Group>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
