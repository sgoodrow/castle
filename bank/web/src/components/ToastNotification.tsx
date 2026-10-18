import { Text, Transition } from "@mantine/core";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./ToastNotification.module.css";

export interface ToastMsg { key: number; text: string; ok: boolean }

// A solid one-line confirmation floating over the bottom-left corner. Fixed, so it never moves anything.
export function ToastNotification({ msg }: { msg: ToastMsg | null }) {
  // Keep showing the last message while it slides away.
  const [last, setLast] = useState(msg);
  if (msg && msg !== last) setLast(msg);
  const m = msg ?? last;
  return (
    <Transition mounted={!!msg} transition="slide-up" duration={160}>
      {style => (
        <div role="status" aria-live="polite" className={classes.toast} data-ok={m?.ok || undefined} style={style}>
          {m?.ok ? <IconCheck size={18} stroke={2.5} aria-hidden /> : <IconInfoCircle size={18} stroke={2} aria-hidden />}
          <Text fz="sm" fw={600} inherit truncate="end">{m?.text}</Text>
        </div>
      )}
    </Transition>
  );
}
