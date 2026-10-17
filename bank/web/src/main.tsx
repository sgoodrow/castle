import "@mantine/core/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import { createRoot } from "react-dom/client";
import App from "./App";

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
