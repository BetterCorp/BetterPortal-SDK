import type { WhoAmIDefinition } from "../../index";
import type { Config } from "../../whoami";
import { RouteLocationRaw } from "vue-router";

function getValueOrDefault<T>(def: T, value?: T): T {
  if (value === undefined) return def;
  if (value === null) return def;
  return value;
}
export interface AppFeatures {
  title: string;
  description: string;
  logo: string;
  showLogin: boolean;
  showChangelog: boolean;
  menu: NavItems;
  theme4: Themeconfig;
}

export interface Themeconfig extends ThemeOptions {
  contentWidth: ContentWidth;
  navbar: NavbarType;
  footer: FooterType;
  nav: AppContentLayoutNav;
  verticalNavCollapsed: boolean;
  navbarBlur: boolean;
}

export interface BPv2WhoAmIDefinition extends WhoAmIDefinition<AppFeatures> {}
export function defaultAppFeatures(
  config: Config,
  features: AppFeatures
): { config: Config; features: AppFeatures } {
  config.title = getValueOrDefault("BetterPortal", config.title);
  /*features.logo = getValueOrDefault(
    "https://content.betterweb.co.za/bettercorp/logos/2022/BetterPortal.png",
    features.logo
  );*/
  features.showLogin = getValueOrDefault(true, features.showLogin);
  features.showChangelog = getValueOrDefault(true, features.showChangelog);
  features.menu = getValueOrDefault([], features.menu);
  features.theme4.defaultTheme = getValueOrDefault('light', features.theme4.defaultTheme);
  //features.theme4. = getValueOrDefault('light', features.theme4.defaultTheme);
  //features.menuType = getValueOrDefault("small-top", features.menuType);
  return {
    features,
    config,
  };
}
export enum ComponentLoadType {
  content = "content",
  embedded = "embedded",
  hidden = "hidden",
}
export interface Component {
  name: string;
  service: string;
  LoadType: ComponentLoadType;
}

export interface AclProperties {
  action: string;
  subject: string;
}

export interface NavSectionTitle extends Partial<AclProperties> {
  heading: string;
}

declare type ATagTargetAttrValues =
  | "_blank"
  | "_self"
  | "_parent"
  | "_top"
  | "framename";
declare type ATagRelAttrValues =
  | "alternate"
  | "author"
  | "bookmark"
  | "external"
  | "help"
  | "license"
  | "next"
  | "nofollow"
  | "noopener"
  | "noreferrer"
  | "prev"
  | "search"
  | "tag";

export interface NavLinkProps {
  to?: RouteLocationRaw | string | null;
  href?: string;
  target?: ATagTargetAttrValues;
  rel?: ATagRelAttrValues;
}

export interface NavLink extends NavLinkProps, Partial<AclProperties> {
  title: string;
  icon?: unknown;
  badgeContent?: string;
  badgeClass?: string;
  disable?: boolean;
}

export interface NavGroup extends Partial<AclProperties> {
  title: string;
  icon?: unknown;
  badgeContent?: string;
  badgeClass?: string;
  children: (NavLink | NavGroup)[];
  disable?: boolean;
}

export declare type NavItems = (NavLink | NavGroup | NavSectionTitle)[];

declare type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
export interface ThemeOptions {
  cspNonce?: string;
  defaultTheme?: string;
  variations?: false | VariationsOptions;
  themes?: Record<string, ThemeDefinition>;
}
declare type ThemeDefinition = DeepPartial<InternalThemeDefinition>;
export interface VariationsOptions {
  colors: string[];
  lighten: number;
  darken: number;
}
export interface InternalThemeDefinition {
  dark: boolean;
  colors: Colors;
  variables: Record<string, string | number>;
}
export interface Colors extends BaseColors, OnColors {
  [key: string]: string;
}
export interface BaseColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}
export interface OnColors {
  "on-background": string;
  "on-surface": string;
  "on-primary": string;
  "on-secondary": string;
  "on-success": string;
  "on-warning": string;
  "on-error": string;
  "on-info": string;
}

export enum ContentWidth {
  Fluid = "fluid",
  Boxed = "boxed",
}

export enum NavbarType {
  Sticky = "sticky",
  Static = "static",
  Hidden = "hidden",
}

export enum FooterType {
  Sticky = "sticky",
  Static = "static",
  Hidden = "hidden",
}

export enum AppContentLayoutNav {
  Vertical = "vertical",
  Horizontal = "horizontal",
}
