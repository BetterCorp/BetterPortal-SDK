import { WhoAmI } from "./whoami";
import type { Config } from "./whoami";
import type { WhoAmIDefinition } from "./whoami";
import { Auth } from "./auth";
import { WS } from "./ws";
import { Request } from "./request";
import mitt from "mitt";
import type { BetterPortalWindow } from "./globals";
import type { AxiosInstance } from "axios";
import { Plugins } from "./plugin";
import { Logger } from "./logger";
declare let window: BetterPortalWindow;

export class BetterPortal<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  public whoami: WhoAmI<Features, Definition>;
  public auth: Auth<Features, Definition>;
  public ws: WS<Features, Definition>;
  public plugins: Plugins<Features, Definition>;
  public logger: Logger<Features, Definition>;
  public async request(service: string): Promise<AxiosInstance> {
    return await Request.getAxios(this.logger, service);
  }
  constructor(myHost?: string) {
    this.logger = new Logger(this);
    if (myHost !== undefined) Request.setHost(this.logger, myHost);
    this.whoami = new WhoAmI(this.logger, myHost);
    this.auth = new Auth(this.logger);
    this.ws = new WS(this.logger);
    this.plugins = new Plugins(this.logger);
  }
  public window(
    appMode: "production" | "development" | "capacitor",
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
    return new Promise(async (r, er) => {
      try {
        window.bsb = window.bsb ?? {};
        window.bsb.storage = window.bsb.storage ?? {};
        window.bsb.ws = window.bsb.ws ?? {};
        window.bsb.betterportal = window.bsb.betterportal ?? {};
        self.logger.window(appMode);
        window.bsb.betterportal.mode = appMode;
        window.bsb.betterportal.events = mitt();

        self.logger.debug("init as: ", whoAmIHost);
        await self.whoami.window(defaultParser, whoAmIHost, hardcodedAppConfig);
        self.logger.debug("init as2: ", whoAmIHost);
        await self.auth.window();
        self.ws
          .connect()
          .then(() => {
            window.bsb.betterportal.ws = window.bsb.betterportal.ws ?? {};
            window.bsb.betterportal.ws.ping = () => self.ws.ping();
            window.bsb.betterportal.ws.subscriptions =
              window.bsb.betterportal.ws.subscriptions ?? {};
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
          .catch(self.logger.error);
        r();
      } catch (exc) {
        self.logger.error(exc);
        er(exc);
      }
    });
  }
}
