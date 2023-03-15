//import type { VuesticConfigConfig } from '@/vuesticConfig';
import type { WhoAmIDefinition } from "../../index";
import type { Config } from "../../whoami";
import type { ColorConfig, PartialGlobalConfig } from "vuestic-ui";

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
  clientListType: number;
  showChangelog: boolean;
  colours?: ColorConfig;
  contentBackground?: string;
  menuType: string;
  theme1?: PartialGlobalConfig;
  loginOptions: AppFeaturesLoginOptions;
}
export interface AppFeaturesLoginOptions {
  login: string[];
  loginRequires: number;
  "2fa": string[];
  "2faRequires": number;
  "2faRequired": boolean;
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
  features.menuType = getValueOrDefault("small-top", features.menuType);
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
