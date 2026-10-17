import "@mantine/core/styles.css";
import "./theme.css";
import { MantineProvider, Paper, Text, Tooltip, createTheme } from "@mantine/core";
import { RouterProvider, createBrowserHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppPane } from "./components/panes/AppPane";
import "./errors";
import { useDevPrimary } from "./devOptions";
import { parseSearch, stringifySearch, validateSearch } from "./state";
import { loadBank, type Payload } from "./data";

// Reserve the scrollbar so filtering a short list never shifts the page sideways.
document.documentElement.style.scrollbarGutter = "stable";

const theme = createTheme({
  primaryColor: "blue",
  autoContrast: true,
  defaultRadius: "md",
  components: {
    Tooltip: Tooltip.extend({
      defaultProps: { openDelay: 0, transitionProps: { duration: 0 }, radius: "sm" },
      styles: { tooltip: { background: "#000", color: "#fff", padding: "2px 6px", fontSize: "var(--mantine-font-size-xs)", lineHeight: 1.35 } },
    }),
    Paper: Paper.extend({ styles: { root: { background: "var(--surface)", boxShadow: "var(--shadow)" } } }),
  },
});

function Root() {
  const primary = useDevPrimary();
  const t = useMemo(() => (primary ? { ...theme, primaryColor: primary } : theme), [primary]);
  return (
    <MantineProvider theme={t} defaultColorScheme="auto">
      <ErrorBoundary>
        <AppPane />
      </ErrorBoundary>
    </MantineProvider>
  );
}

// One route: the page itself. Filters are its search params.
const route = createRootRoute({ validateSearch, component: Root });

const router = createRouter({ routeTree: route, history: createBrowserHistory(), parseSearch, stringifySearch });
declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

// The bank comes from the bot's database; the page waits for it so nothing jumps on arrival.
async function bank(): Promise<Payload> {
  const res = await fetch("/api/bank", { credentials: "same-origin" });
  if (res.status === 401) {
    location.href = "/auth/login"; // the session ran out
    return new Promise(() => {});
  }
  if (!res.ok) throw new Error(`The bank server answered ${res.status}`);
  return res.json();
}

// index.html ships the #root element, so it's always there.
const root = createRoot(document.getElementById("root")!);
bank().then(
  p => {
    loadBank(p);
    root.render(<RouterProvider router={router} />);
  },
  err => root.render(
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Text p="xl" ta="center" c="dimmed">Couldn't load the bank. {String(err.message || err)}. Try reloading.</Text>
    </MantineProvider>
  ),
);
