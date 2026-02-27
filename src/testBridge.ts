// src/testBridge.ts
import { bus } from "./bus";

/* ------------------------------------------------------------
   Machine Log Shape
------------------------------------------------------------ */

export type MachineLogEvent = {
  t: number;
  phase: "event" | "transition";
  event?: string;
  value: unknown;
  context: unknown;
};

/* ------------------------------------------------------------
   Bridge Interface
------------------------------------------------------------ */

export interface SocraticBridge {
  emit: (type: string, payload?: unknown) => void;
  machineEvents: MachineLogEvent[];
  onMachineEvent: (payload: MachineLogEvent) => void;
  clearMachineEvents: () => void;
}

/* ------------------------------------------------------------
   Global Window Augmentation
------------------------------------------------------------ */

declare global {
  interface Window {
    __socratic?: SocraticBridge;
  }
}

/* ------------------------------------------------------------
   Install Bridge
------------------------------------------------------------ */

export function installTestBridge() {
  // Only install in dev or test mode
  if (!import.meta.env.DEV && import.meta.env.MODE !== "test") return;

  const bridge: SocraticBridge = {
    emit: (type, payload) => {
      bus.emit(type as any, payload);
    },

    machineEvents: [],

    onMachineEvent(payload) {
      bridge.machineEvents.push(payload);
    },

    clearMachineEvents() {
      bridge.machineEvents.length = 0;
    },
  };

  window.__socratic = bridge;
}
