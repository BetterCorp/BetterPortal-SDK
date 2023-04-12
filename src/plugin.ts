import type { ServiceRoute, WhoAmIDefinition } from "./whoami";
import { WhoAmI } from "./whoami";
import { Storage } from "./storage";
import { Request } from "./request";
import type {
  BetterPortalCapabilityConfigurable,
  BetterPortalCapabilityReturnCapabilities,
  BetterPortalCapabilityReturnConfigurable,
  BetterPortalWindow,
  PluginRequestHandler,
} from "./globals";
import type { IDictionary } from "@bettercorp/tools/lib/Interfaces";
import { Tools } from "@bettercorp/tools";
import { Logger } from "./logger";
import { AxiosResponse } from 'axios';
declare let window: BetterPortalWindow;

export interface ServiceRouteExpanded extends ServiceRoute {
  service: string;
}

export class Plugins<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  protected whoAmI!: WhoAmI<Features, Definition>;
  private logger: Logger<Features, Definition>;
  constructor(logger: Logger<Features, Definition>) {
    this.logger = logger;
    this.whoAmI = new WhoAmI(logger);
  }
  private _activePlugins: IDictionary<Plugin<Features, Definition>> | null =
    null;
  public async getPlugins(): Promise<Array<Plugin<Features, Definition>>> {
    if (this._activePlugins !== null)
      return Object.keys(this._activePlugins).map(
        (x) => this._activePlugins![x]
      );

    let appConfig = await this.whoAmI.getApp();
    let plugins: IDictionary<Plugin<Features, Definition>> = {};

    let pluginNames = Object.keys(appConfig.servers).filter(
      (x) => x !== "enabled"
    );
    for (let pluginName of pluginNames) {
      let plugin = new Plugin<Features, Definition>(this.logger, pluginName);
      if (await plugin.isAvailable()) plugins[pluginName] = plugin;
    }

    this._activePlugins = plugins;
    return Object.keys(this._activePlugins).map((x) => this._activePlugins![x]);
  }
  public async getPlugin(
    pluginName: string
  ): Promise<Plugin<Features, Definition> | null> {
    if (this._activePlugins !== null)
      return this._activePlugins![pluginName] || null;

    await this.getPlugins();

    return this._activePlugins![pluginName] || null;
  }
  public async getRoutes(): Promise<Array<ServiceRouteExpanded>> {
    if (this._activePlugins === null) await this.getPlugins();

    let routes: Array<ServiceRouteExpanded> = [];
    let pluginNames = Object.keys(this._activePlugins!);
    for (let plugin of pluginNames) {
      routes = routes.concat(await this._activePlugins![plugin].routes());
    }

    return routes;
  }
}

export class Plugin<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  protected _serviceName: string;
  protected storage: Storage<Features, Definition>;
  protected whoAmI!: WhoAmI<Features, Definition>;
  private logger: Logger<Features, Definition>;
  constructor(logger: Logger<Features, Definition>, serviceName: string) {
    this._serviceName = serviceName;
    this.logger = logger;
    this.storage = new Storage(logger, serviceName);
    this.whoAmI = new WhoAmI(logger);
  }
  public get name() {
    return this._serviceName;
  }
  public async isAvailable(): Promise<boolean> {
    let appConfig = await this.whoAmI.getApp();
    if (appConfig.config.serviceMapping === undefined) return false;
    if (appConfig.config.serviceMapping[this._serviceName] === undefined)
      return false;
    return true;
  }
  public async routes(): Promise<Array<ServiceRouteExpanded>> {
    let appConfig = await this.whoAmI.getApp();
    if (appConfig.config.serviceMapping === undefined)
      throw "plugins not setup!";
    if (appConfig.config.serviceMapping[this._serviceName] === undefined)
      throw "plugin not available!";

    return appConfig.config.serviceMapping[this._serviceName].routes.map(
      (x) => {
        return {
          ...x,
          service: this._serviceName,
        };
      }
    );
  }
  public async subscriptions(path?: string): Promise<Array<string>> {
    let appConfig = await this.whoAmI.getApp();
    if (appConfig.config.serviceMapping === undefined)
      throw "plugins not setup!";
    if (appConfig.config.serviceMapping[this._serviceName] === undefined)
      throw "plugin not available!";

    return appConfig.config.serviceMapping[this._serviceName].globals
      .subscriptions;
  }
  public async getCapabilities(): Promise<
  BetterPortalCapabilityReturnCapabilities
  > {
    const resq = await (
      await Request.getAxios(this.logger, this._serviceName)
    ).get(`/bp/capabilities`);
    let t: BetterPortalCapabilityReturnCapabilities = {} as any;
    t.permissions
    if (Tools.isArray(resq.data)) return {};
    return resq.data;
  }
  public async getCapability<T extends BetterPortalCapabilityConfigurable>(
    capability: T,
    param?: string,
    optionalParams?: Record<string, string>
  ): Promise<BetterPortalCapabilityReturnConfigurable<T>> {
    const resq = await (
      await Request.getAxios(this.logger, this._serviceName)
    ).get(
      `/bp/capabilities/${capability}/${
        Tools.isNullOrUndefined(param) ? "" : `${param}`
      }`,
      { params: optionalParams }
    );
    return resq.data;
  }
  public async getUIComponent(
    uiComponent: string
  ): Promise<{ content: string; hash: string }> {
    let appConfig = await this.whoAmI.getApp();
    const resq = await (
      await Request.getAxios(this.logger, this._serviceName)
    ).get(`/bpui/views/${appConfig.config.appType}/${uiComponent}.vue`);
    return {
      content: resq.data,
      hash: resq.headers["ETag"]?.toString() || "-",
    };
  }
  public async getUIElement(
    elementOrAssetPath: string
  ): Promise<{ content: string; hash: string; type: string; url: string }> {
    //let appConfig = await this.whoAmI.getApp();
    const resq = await (
      await Request.getAxios(this.logger, this._serviceName)
    ).get(`/bpui/${elementOrAssetPath}`);
    return {
      content: resq.data,
      url: resq.request!.responseURL,
      type:
        resq.headers["content-type"]?.toString() || "application/javascript",
      hash: resq.headers["ETag"]?.toString() || "-",
    };
  }
  public async getUIBaseUrl(): Promise<string> {
    return `${await Request.getAxiosBaseURL(
      this.logger,
      this._serviceName
    )}/bpui`;
  }
  
  public async read<ReturnType = any, RETRESP extends true | undefined = undefined>(
    path: string,
    query?: Record<string, string>,
    headers?: Record<string, string>,
    returnResponse?: RETRESP
  ): Promise<PluginRequestHandler<ReturnType, RETRESP>> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      (await Request.getAxios(self.logger, self._serviceName))
        .get<any, AxiosResponse<ReturnType>>(
          path +
            (query
              ? `?${Object.keys(query)
                  .map((x) => `${x}=${encodeURIComponent(query[x])}`)
                  .join("&")}`
              : ""),
          {
            headers,
          }
        )
        .then((resp) => {
          resp.status === 200 ? resolve(returnResponse ? resp as any : resp.data) : reject(returnResponse ? resp : resp.data);
        })
        .catch((resp) => {
          self.logger.error(resp.response.data);
          reject(returnResponse ? resp : resp.response.data);
        });
    });
  }
  public async create<ReturnType = any, CreateType = any>(
    path: string,
    data: CreateType,
    query?: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ReturnType> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      (await Request.getAxios(self.logger, self._serviceName))
        .post<any, AxiosResponse<ReturnType>, CreateType>(
          path +
            (query
              ? `?${Object.keys(query)
                  .map((x) => `${x}=${encodeURIComponent(query[x])}`)
                  .join("&")}`
              : ""),
          data,
          {
            headers,
          }
        )
        .then((resp) => {
          resp.status === 200 ? resolve(resp.data) : reject(resp.data);
        })
        .catch((resp) => {
          self.logger.error(resp.response.data);
          reject(resp.response.data);
        });
    });
  }
  public async update<ReturnType = any, UpdateType = any>(
    path: string,
    data: UpdateType,
    query?: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ReturnType> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      (await Request.getAxios(self.logger, self._serviceName))
        .patch<any, AxiosResponse<ReturnType>, UpdateType>(
          path +
            (query
              ? `?${Object.keys(query)
                  .map((x) => `${x}=${encodeURIComponent(query[x])}`)
                  .join("&")}`
              : ""),
          data,
          {
            headers,
          }
        )
        .then((resp) => {
          resp.status === 200 ? resolve(resp.data) : reject(resp.data);
        })
        .catch((resp) => {
          self.logger.error(resp.response.data);
          reject(resp.response.data);
        });
    });
  }
  public async delete<ReturnType = any>(
    path: string,
    query?: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ReturnType> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      (await Request.getAxios(self.logger, self._serviceName))
        .delete<any, AxiosResponse<ReturnType>>(
          path +
            (query
              ? `?${Object.keys(query)
                  .map((x) => `${x}=${encodeURIComponent(query[x])}`)
                  .join("&")}`
              : ""),
          {
            headers,
          }
        )
        .then((resp) => {
          resp.status === 200 ? resolve(resp.data) : reject(resp.data);
        })
        .catch((resp) => {
          self.logger.error(resp.response.data);
          reject(resp.response.data);
        });
    });
  }
  public async execute<ReturnType = any, ExecuteType = any>(
    path: string,
    data: ExecuteType,
    query?: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ReturnType> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      (await Request.getAxios(self.logger, self._serviceName))
        .put<any, AxiosResponse<ReturnType>, ExecuteType>(
          path +
            (query
              ? `?${Object.keys(query)
                  .map((x) => `${x}=${encodeURIComponent(query[x])}`)
                  .join("&")}`
              : ""),
          data,
          {
            headers,
          }
        )
        .then((resp) => {
          resp.status === 200 ? resolve(resp.data) : reject(resp.data);
        })
        .catch((resp) => {
          self.logger.error(resp.response.data);
          reject(resp.response.data);
        });
    });
  }
}
