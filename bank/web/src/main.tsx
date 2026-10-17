import "@mantine/core/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import { createRoot } from "react-dom/client";
import App from "./App";

// Reserve the scrollbar so filtering a short list never shifts the page sideways.
document.documentElement.style.scrollbarGutter = "stable";

const theme = createTheme({
  primaryColor: "yellow",
  autoContrast: true,
  defaultRadius: "md",
});

createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <App />
  </MantineProvider>,
);
