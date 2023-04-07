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
export interface BPW_BSB_BP_LOG {
  info: { (...args: Array<any>): void };
  error: { (...args: Array<any>): void };
  warn: { (...args: Array<any>): void };
  debug: { (...args: Array<any>): void };
}
export interface BPW_BSB_BP {
  mode: "production" | "development" | "capacitor";
  ws: BPW_BSB_BP_WS;
  whoami: BPW_BSB_BP_WHOAMI;
  events: Emitter<BSPEvents>;
  log: BPW_BSB_BP_LOG;
}
export interface BPW_BSB {
  betterportal: BPW_BSB_BP;
  tabId: number;
  ws: {
    sessionId: string | null;
    connected: boolean;
  };
  storage: any;
}
export interface BetterPortalWindow extends Window {
  bsb: BPW_BSB;
}
export enum BetterPortalCapabilityConfigurable {
  search = "search",
  searchCache = "searchCache",
  searchAuthed = "searchAuthed",
  searchCacheAuthed = "searchCacheAuthed",
  changelog = "changelog",
  settings = "settings",
  settingsAuthed = "settingsAuthed",
}
export enum BetterPortalCapabilityInternal {
  uiServices = "uiServices",
  permissions = "permissions",
}
export type BetterPortalCapability =
  | BetterPortalCapabilityInternal
  | BetterPortalCapabilityConfigurable;
