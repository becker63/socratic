import React from "react";
import mermaid from "mermaid";
import { Box, Heading } from "@chakra-ui/react";
import { bus } from "../replay/bus";

let initialized = false;

export function MermaidRenderer({ code }: { code: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false });
      initialized = true;
    }
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    (async () => {
      try {
        el.innerHTML = "";
        const id = `m-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        if (cancelled) return;
        el.innerHTML = svg;
        bus.emit("MERMAID_READY");
      } catch {
        if (cancelled) return;
        el.textContent = code; // fallback to raw text
        bus.emit("MERMAID_READY");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <Box borderWidth="1px" borderRadius="lg" p="4">
      <Heading size="sm" mb="3">
        Mermaid Diagram
      </Heading>
      <Box ref={ref} overflowX="auto" />
    </Box>
  );
}
