import type { IDictionary } from "@bettercorp/tools/lib/Interfaces";
import { Request } from "./request";
import { Storage } from "./storage";
import { Tools } from "@bettercorp/tools/lib/Tools";
import { Logger } from "./logger";

export type AxiosResponse<T = any> = {
  status: number;
  data: T;
};

export class WhoAmI<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  private storage: Storage<Features, Definition>;
  public logger: Logger<Features, Definition>;
  private timer: NodeJS.Timer | null = null;
  constructor(logger: Logger<Features, Definition>, myHost?: string) {
    this.logger = logger;
    this.storage = new Storage(logger, "whoami");
  }
  public dispose() {
    if (this.timer !== null) clearInterval(this.timer);
  }
  public async window(
    defaultParser?: {
      (config: Config, features: Features): {
        config: Config;
        features: Features;
      };
    },
    whoAmIHost?: string,
    hardcodedAppConfig?: Definition
  ) {
    const self = this;
    this.timer = setInterval(async () => {
      self.logger.debug("refresh app");
      await self.refresh(defaultParser);
    }, 30 * 60 * 1000);
    self.logger.debug("refresh app");
    if (Tools.isNullOrUndefined(hardcodedAppConfig))
      await self.refresh(defaultParser, whoAmIHost);
    else await self.getApp(defaultParser, whoAmIHost, hardcodedAppConfig);
  }
  private async refresh(
    defaultParser?: {
      (config: Config, features: Features): {
        config: Config;
        features: Features;
      };
    },
    whoAmIHost?: string
  ) {
    await this._getApp(defaultParser, whoAmIHost, undefined, true);
  }
  async getApp(
    defaultParser?: {
      (config: Config, features: Features): {
        config: Config;
        features: Features;
      };
    },
    whoAmIHost?: string,
    hardcodedAppConfig?: Definition
  ): Promise<Definition> {
    return await this._getApp(defaultParser, whoAmIHost, hardcodedAppConfig);
  }
  private async _getApp(
    defaultParser?: {
      (config: Config, features: Features): {
        config: Config;
        features: Features;
      };
    },
    whoAmIHost?: string,
    hardcodedAppConfig?: Definition,
    force: boolean = false
  ): Promise<Definition> {
    if (Tools.isString(whoAmIHost)) {
      this.storage.set("host", whoAmIHost);
    }

    if (
      !force &&
      !this.storage.has("config") &&
      !Tools.isNullOrUndefined(hardcodedAppConfig)
    ) {
      /*this.storage.set("whoami", "config", {
        data: hardcodedAppConfig,
        time: -1,
      });*/
      return hardcodedAppConfig;
    }

    const self = this;
    return await this.storage.cachedREGet<Definition>(
      "config",
      async () => {
        let resp = await (
          await Request.getAxios(
            self.logger,
            "whoami",
            self.storage.get("host") || undefined
          )
        ).get<Definition>("/app");
        if (resp.status !== 202) throw "Invalid APP";
        if (defaultParser !== undefined) {
          const respParsed = defaultParser(
            resp.data.config || {},
            resp.data.features || ({} as any)
          );
          resp.data.config = respParsed.config;
          resp.data.features = respParsed.features;
        }
        if (resp.data.config.additionalServers !== undefined) {
          resp.data.servers = {
            ...resp.data.servers,
            ...resp.data.config.additionalServers,
          };
        }
        return resp.data;
      },
      60000
    );
  }
}

export interface WhoAmIDefinition<Features = any> {
  servers: IDictionary<ServerConfig>;
  appId: string;
  tenantId: string;
  tenant: Tenant;
  config: Config;
  // App features
  features: Features;
}

export interface Tenant {
  name: string;
  region: string;
  company: Company;
}

export interface Company {
  name: string;
  supportEmail: string;
  supportNumber: string;
  address: Address;
  links: Links;
  logo: string;
  logoLight: string;
  registrationNumber: string;
  VATNumber: string | null;
}

export interface Links {
  Website: string;
}

export interface Address {
  address: string;
  addressGeo: {
    lat: number;
    lng: number;
  } | null;
}
export interface Config {
  hostname: string;
  tenantId: string;
  title: string;
  cfClientToken: string;
  active: boolean;
  appType: number;
  serviceMapping?: IDictionary<ServiceConfig>;
  additionalServers?: IDictionary<ServerConfig>;
}

export interface ServerConfig {
  enabled: boolean;
  url: string;
}

export enum ServiceConfigGlobalComponentPlacement {
  app = "app",
  header = "header",
  footer = "footer",
  menu = "menu",
  content = "content",
}
export interface ServiceConfigGlobalComponent {
  placement: ServiceConfigGlobalComponentPlacement;
  component: string;
}
export enum ServiceConfigGlobalsMappedServiceParamType {
  password = "password",
  text = "text",
  number = "number",
  select = "select",
}
export interface ServiceConfigGlobalsMappedServiceParam {
  id: string;
  name: string;
  type: ServiceConfigGlobalsMappedServiceParamType;
  options?: Array<string>;
}
export interface ServiceConfigGlobalsMappedService {
  nameIdKey: string;
  serviceId: string;
  params: Array<ServiceConfigGlobalsMappedServiceParam>;
}
export interface ServiceConfigGlobals {
  mappedServices: Array<ServiceConfigGlobalsMappedService>;
  requiredServices: Array<string>;
  subscriptions: Array<string>;
  components: Array<ServiceConfigGlobalComponent>;
}
export interface ServiceConfig {
  globals: ServiceConfigGlobals;
  routes: Array<ServiceRoute>;
}

export interface ServiceRoute {
  name: string;
  path: string;
  crumbs: Array<string>;
  params: Array<string>;
  component: string;
  subscriptions: Array<string>;
  requireServices: Array<string>;
  meta?: any;
}
