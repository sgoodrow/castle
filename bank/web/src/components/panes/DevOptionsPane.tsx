import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { OPTIONS, load, pickDevOption } from "../../devOptions";

// Dev only: buttons for the candidate looks listed in devOptions.ts.
export function DevOptionsPane() {
  const [v, setV] = useState(load);
  if (!OPTIONS.length) return null;
  const pick = (k: string, x: string) => {
    const next = { ...v, [k]: x };
    setV(next);
    pickDevOption(next);
  };
  return (
    <Paper p="xs" style={{ position: "fixed", right: 12, bottom: 12, zIndex: 300 }}>
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
    </Paper>
  );
}
