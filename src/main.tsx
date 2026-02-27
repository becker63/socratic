// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { App } from "./App";
import { installTestBridge } from "./testBridge";

let inspector: ReturnType<
  typeof import("@statelyai/inspect").createBrowserInspector
> | null = null;

if (import.meta.env.DEV) {
  const { createBrowserInspector } = await import("@statelyai/inspect");

  inspector = createBrowserInspector();
}

installTestBridge();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <App inspector={inspector} />
    </ChakraProvider>
  </React.StrictMode>,
);
