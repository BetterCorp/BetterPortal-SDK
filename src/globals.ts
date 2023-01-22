import type { Emitter, EventType } from "mitt";
import type { WhoAmIDefinition } from "./whoami";
export interface BPW_BSB_BP_WS_SUBSCRIPTIONS {
  add: { (subscriptions: Array<string>): void };
  remove: { (subscriptions: Array<string>): void };
}
export interface BPW_BSB_BP_WS {
  ping: { (): void };
  subscriptions: BPW_BSB_BP_WS_SUBSCRIPTIONS;
}
export interface BSPEvents extends Record<EventType, any> {}
export interface BPW_BSB_BP_WHOAMI {
  host: string;
  get: { async<T extends WhoAmIDefinition = WhoAmIDefinition>(): Promise<T> };
}
export interface BPW_BSB_BP {
  ws: BPW_BSB_BP_WS;
  whoami: BPW_BSB_BP_WHOAMI;
  events: Emitter<BSPEvents>;
}
export interface BPW_BSB {
  betterportal: BPW_BSB_BP;
  tabId: number;
  ws: {
    sessionId: string | null;
    connected: boolean;
  },
  storage: any
}
export interface BetterPortalWindow extends Window {
  bsb: BPW_BSB
}
