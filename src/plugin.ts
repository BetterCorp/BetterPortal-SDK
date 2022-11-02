import type { ServiceRoute, WhoAmIDefinition } from "./whoami";
import { WhoAmI } from "./whoami";
import { Storage } from "./storage";
import { Request } from "./request";
import type { BetterPortalWindow } from "./globals";
import type { IDictionary } from "@bettercorp/tools/lib/Interfaces";
declare let window: BetterPortalWindow;

export interface ServiceRouteExpanded extends ServiceRoute {
  service: string;
}

export class Plugins<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  protected whoAmI!: WhoAmI<Features, Definition>;
  constructor() {
    this.whoAmI = new WhoAmI();
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
      let plugin = new Plugin<Features, Definition>(pluginName);
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
  protected storage: Storage;
  protected whoAmI!: WhoAmI<Features, Definition>;
  constructor(serviceName: string) {
    this._serviceName = serviceName;
    this.storage = new Storage(serviceName);
    this.whoAmI = new WhoAmI();
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
  public async getUIComponent(uiComponent: string): Promise<string> {
    let appConfig = await this.whoAmI.getApp();
    return (
      await (
        await Request.getAxios(this._serviceName)
      ).get(`/bpui/${appConfig.config.appType}/${uiComponent}.js`)
    ).data;
  }
  public async getUIComponentAssetURL(assetPath: string): Promise<string> {
    //if (assetPath.indexOf('@/') !== 0) return assetPath;    
    return `${await Request.getAxiosBaseURL(this._serviceName)}/bpui/${assetPath}`
  }
  /*public async window(): Promise<void> {

  }*/
}
