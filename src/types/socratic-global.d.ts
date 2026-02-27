import type { SocraticBridge } from "../testBridge";

declare global {
  interface Window {
    __socratic?: SocraticBridge;
  }
}

export {};
