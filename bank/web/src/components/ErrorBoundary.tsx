import { Button, Stack, Text } from "@mantine/core";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../errors";

// A crash anywhere in the page shows this instead of a blank screen, and gets reported.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info.componentStack ?? undefined);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Stack align="center" p="xl" gap="sm">
        <Text fw={600}>Something went wrong.</Text>
        <Text c="dimmed" ta="center">It's been reported so it can be fixed. Reload the page to carry on.</Text>
        <Button variant="light" onClick={() => location.reload()}>Reload</Button>
      </Stack>
    );
  }
}
