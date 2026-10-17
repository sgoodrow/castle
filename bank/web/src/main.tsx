import "@mantine/core/styles.css";
import "./theme.css";
import { MantineProvider, Paper, Tooltip, createTheme } from "@mantine/core";
import { RouterProvider, createBrowserHistory, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useDevPrimary } from "./components/DevOptions";
import { parseSearch, stringifySearch, validateSearch } from "./state";

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
      <App />
    </MantineProvider>
  );
}

// One route: the page itself. Filters are its search params.
const route = createRootRoute({ validateSearch, component: Root });

// Some embeds (the artifact viewer) refuse history writes; keep state in memory there.
function canWriteUrl() {
  try { history.replaceState(history.state, "", location.href); return true; } catch { return false; }
}
const real = canWriteUrl();
const router = createRouter({
  routeTree: route,
  // Serve from whichever folder the page sits in (Pages puts it under /castle/).
  basepath: real ? location.pathname.replace(/[^/]*$/, "") : "/",
  history: real ? createBrowserHistory() : createMemoryHistory(),
  parseSearch,
  stringifySearch,
});
declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
