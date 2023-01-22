import type { IDictionary } from "@bettercorp/tools/lib/Interfaces";
import { Request } from "./request";
import { Storage } from "./storage";
import { Tools } from "@bettercorp/tools/lib/Tools";

export type AxiosResponse<T = any> = {
  status: number;
  data: T;
};

export class WhoAmI<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  private storage: Storage;
  constructor(myHost?: string) {
    this.storage = new Storage("whoami", ["host"]);
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
    if (!Tools.isNullOrUndefined(whoAmIHost)) {
      this.storage.set('host', whoAmIHost);
    }
    if (hardcodedAppConfig !== undefined && hardcodedAppConfig !== null) {
      /*this.storage.set("whoami", "config", {
        data: hardcodedAppConfig,
        time: -1,
      });*/
      return hardcodedAppConfig;
    }
    
    return await this.storage.cachedREGet<Definition>("config", async () => {
      try {
        let resp = await (
          await Request.getAxios("whoami", whoAmIHost)
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
      } catch (exc: any) {
        throw exc;
      }
    }, 60000);
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
  links: Links;
  logo: string;
  logoLight: string;
}

export interface Links {
  Website: string;
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
