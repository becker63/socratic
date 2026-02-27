// src/testBridge.ts
import { bus } from "./bus";

export function installTestBridge() {
  if (!import.meta.env.DEV && import.meta.env.MODE !== "test") return;

  (window as any).__socratic = {
    emit: (type: string, payload?: any) => bus.emit(type as any, payload),

    machineEvents: [] as string[],

    onMachineEvent(type: string) {
      (window as any).__socratic.machineEvents.push(type);
    },
  };
}
