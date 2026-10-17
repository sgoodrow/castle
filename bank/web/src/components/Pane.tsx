import { Collapse, Paper, Title, UnstyledButton, type PaperProps } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface Props extends PaperProps {
  id: string; // remembers open or closed under this name
  title: ReactNode;
  actions?: ReactNode; // controls on the right of the title bar; clicking them doesn't fold the pane
  children: ReactNode;
}

// A bordered pane whose title bar folds it away. Each pane remembers its own state.
export function Pane({ id, title, actions, children, ...paper }: Props) {
  const [open, setOpen] = useLocalStorage({ key: `castle-bank-pane-${id}`, defaultValue: true, getInitialValueInEffect: false });
  return (
    <Paper withBorder radius="md" {...paper}>
      <div className="pane-head" data-closed={!open || undefined}>
        <UnstyledButton className="pane-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <IconChevronDown size={14} stroke={2} className="pane-chevron" aria-hidden />
          <Title order={2} fz="md">{title}</Title>
        </UnstyledButton>
        {actions}
      </div>
      <Collapse in={open} transitionDuration={150}>{children}</Collapse>
    </Paper>
  );
}
