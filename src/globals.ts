import type { Emitter, EventType } from "mitt";
import type { WhoAmIDefinition } from "./whoami";
import { AxiosResponse } from "axios";
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

export type PluginRequestHandler<
  ReturnType = any,
  ReturnResponse extends true | undefined = undefined
> = ReturnResponse extends true ? AxiosResponse<ReturnType> : ReturnType;

export interface Searchable {
  id: string;
  pathkey: string;
  searchableFields: Record<string, string>;
}
export enum ChangelogItemType {
  fixed = "fixed",
  added = "added",
  changed = "changed",
  removed = "removed",
  deprecated = "deprecated",
  security = "security",
}
export interface ChangelogItem {
  date: number;
  changes: Array<{
    notes: string;
    type: ChangelogItemType;
  }>;
}
export interface Setting {
  id: string;
  name: string;
  description: string;
  type: "string" | "int" | "float" | "boolean";
  default: string | number | boolean;
  required: boolean;
  nullable: boolean;
}
export enum BetterPortalCapabilityConfigurableAuthed {
  searchAuthed = "searchAuthed",
  searchCacheAuthed = "searchCacheAuthed",
  settingsAuthed = "settingsAuthed",
}
export interface BetterPortalCapabilityReturnCapabilitiesAuthed {
  searchAuthed?: Array<string>;
  searchCacheAuthed?: Array<string>;
  settingsAuthed?: Array<string>;
}
export enum BetterPortalCapabilityConfigurablePublic {
  search = "search",
  searchCache = "searchCache",
  changelog = "changelog",
  settings = "settings",
}
export interface BetterPortalCapabilityReturnCapabilitiesPublic {
  search?: Array<string>;
  searchCache?: Array<string>;
  changelog?: Array<string>;
  settings?: Array<string>;
}
export enum BetterPortalCapabilityInternal {
  uiServices = "uiServices",
  permissions = "permissions",
}
export interface BetterPortalCapabilityReturnCapabilitiesInternal {
  uiServices?: Array<string>;
  permissions?: Array<string>;
}

export type BetterPortalCapabilityConfigurable =
  | BetterPortalCapabilityConfigurablePublic
  | BetterPortalCapabilityConfigurableAuthed;
export type BetterPortalCapability =
  | BetterPortalCapabilityInternal
  | BetterPortalCapabilityConfigurable;

export type BetterPortalCapabilityReturnConfigurable<
  Capability extends BetterPortalCapability
> = Capability extends BetterPortalCapabilityConfigurablePublic.search
  ? Array<Searchable> // search with param request
  : Capability extends BetterPortalCapabilityConfigurableAuthed.searchAuthed
  ? Array<Searchable> // search with param request (authed)
  : Capability extends BetterPortalCapabilityConfigurablePublic.searchCache
  ? Array<Searchable> // cache search, client side search
  : Capability extends BetterPortalCapabilityConfigurableAuthed.searchCacheAuthed
  ? Array<Searchable> // cache search, client side search (authed)
  : Capability extends BetterPortalCapabilityConfigurablePublic.changelog
  ? Array<ChangelogItem>
  : Capability extends BetterPortalCapabilityConfigurablePublic.settings
  ? Array<Setting>
  : Capability extends BetterPortalCapabilityConfigurableAuthed.settingsAuthed
  ? Array<Setting>
  : never;

export interface BetterPortalCapabilityReturnCapabilities
  extends BetterPortalCapabilityReturnCapabilitiesPublic,
    BetterPortalCapabilityReturnCapabilitiesInternal,
    BetterPortalCapabilityReturnCapabilitiesAuthed {}
