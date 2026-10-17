import { ActionIcon, CloseButton, Group, Indicator, TextInput } from "@mantine/core";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { activeChips, type Filters } from "../../state";

interface Props {
  f: Filters;
  set: (p: Partial<Filters>) => void;
  onFilters?: () => void; // phones: open the filter drawer
}


export function SearchPane({ f, set, onFilters }: Props) {
  // The box keeps its own text: the URL catches up a tick later and would eat fast keystrokes.
  const [q, setQ] = useState(f.q);
  const sent = useRef(f.q);
  useEffect(() => { if (f.q !== sent.current) { sent.current = f.q; setQ(f.q); } }, [f.q]);
  const search = (v: string) => { setQ(v); sent.current = v; set({ q: v }); };
  const chips = activeChips(f);
  return (
    <>
      <Group gap="xs" wrap="nowrap">
        {onFilters && (
          <Indicator disabled={!chips.length} label={chips.length} size={16}>
            <ActionIcon size={36} variant="default" aria-label="Filters" onClick={onFilters}>
              <IconFilter size={18} />
            </ActionIcon>
          </Indicator>
        )}
        <TextInput
          style={{ flex: 1 }}
          size="sm"
          aria-label="Search the bank"
          placeholder={onFilters ? "Search the bank" : "Search the bank: names and stats, e.g. haste, FR, mana"}
          leftSection={<IconSearch size={16} />}
          rightSectionWidth={36}
          rightSection={
            <Group gap={0} wrap="nowrap" pr={4}>
              <CloseButton size="sm" aria-label="Clear search" onClick={() => search("")} style={{ visibility: q ? "visible" : "hidden" }} />
            </Group>
          }
          value={q}
          onChange={e => search(e.currentTarget.value)}
        />
      </Group>
    </>
  );
}
