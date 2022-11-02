import { WhoAmI } from "./whoami";
import type { Config } from "./whoami";
import type { WhoAmIDefinition } from "./whoami";
import { Auth } from "./auth";
import { WS } from "./ws";
import { Request } from "./request";
import mitt from "mitt";
import type { BetterPortalWindow } from "./globals";
import type { AxiosInstance } from "axios";
import { Plugins } from './plugin';
declare let window: BetterPortalWindow;

export class BetterPortal<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  public whoami: WhoAmI<Features, Definition>;
  public auth: Auth<Features, Definition>;
  public ws: WS<Features, Definition>;
  public plugins: Plugins<Features, Definition>;
  public async request(service: string): Promise<AxiosInstance> {
    return await Request.getAxios(service);
  }
  constructor(myHost?: string) {
    if (myHost !== undefined) Request.setHost(myHost);
    this.whoami = new WhoAmI(myHost);
    this.auth = new Auth();
    this.ws = new WS();
    this.plugins = new Plugins();
  }
  public window(
    defaultParser?: {
      (config: Config, features: Features): {
        config: Config;
        features: Features;
      };
    },
    whoAmIHost?: string,
    hardcodedAppConfig?: Definition
  ): Promise<void> {
    const self = this;
    return new Promise(async (r) => {
      window.bsb = window.bsb || {};
      window.bsb.betterportal = window.bsb.betterportal || {};
      window.bsb.betterportal.events = mitt();
      await self.whoami.getApp(defaultParser, whoAmIHost, hardcodedAppConfig);
      await self.auth.window();
      self.ws
        .connect()
        .then(() => {
          window.bsb.betterportal.ws = window.bsb.betterportal.ws || {};
          window.bsb.betterportal.ws.ping = () => self.ws.ping();
          window.bsb.betterportal.ws.subscriptions =
            window.bsb.betterportal.ws.subscriptions || {};
          window.bsb.betterportal.ws.subscriptions.add = (
            subscriptions: Array<string>
          ) => {
            self.ws.addSubscription(subscriptions);
          };
          window.bsb.betterportal.ws.subscriptions.remove = (
            subscriptions: Array<string>
          ) => {
            self.ws.removeSubscription(subscriptions);
          };
        })
        .catch(console.error);
      r();
    });
  }
}
