import { Auth } from "./auth";
import { WhoAmI } from "./whoami";
import type { WhoAmIDefinition } from "./whoami";
import { Storage } from "./storage";
import type { BetterPortalWindow } from "./globals";
import { Tools } from "@bettercorp/tools/lib/Tools";
declare let window: BetterPortalWindow;

export class WS<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  private wsClient!: WebSocket;
  private subscriptions!: Array<string>;
  public addSubscription(subscriptions: Array<string>) {
    for (let sub of subscriptions) {
      if (this.subscriptions.indexOf(sub) < 0) this.subscriptions.push(sub);
    }
    this.ping();
  }
  public removeSubscription(subscriptions: Array<string>) {
    for (let sub of subscriptions) {
      if (this.subscriptions.indexOf(sub) >= 0)
        this.subscriptions.splice(this.subscriptions.indexOf(sub), 1);
    }
    this.ping();
  }
  private whoAmI!: WhoAmI<Features, Definition>;
  private auth!: Auth<Features, Definition>;
  private storage: Storage;
  private timer: NodeJS.Timer | null = null;
  public get sessionId(): string | null {
    return this.storage.get("session");
  }
  public get connected(): boolean {
    return this.storage.get("connected") === true;
  }
  public dispose() {
    if (this.timer !== null) clearInterval(this.timer);
    if (this.wsClient.readyState !== 1) return;
    this.wsClient.close();
  }
  constructor(subscriptions?: Array<string>, lightInit: boolean = false) {
    this.storage = new Storage("ws", true);
    if (lightInit) return;
    if (!Tools.isNullOrUndefined(this.storage.get("tabId"))) {
      return; // light init forced
    }
    this.storage.set("tabId", Math.floor(Math.random() * 1000000));
    this.subscriptions = subscriptions || [];
    this.whoAmI = new WhoAmI();
    this.auth = new Auth();
  }
  public send<T = any>(action: string, data: T, raw?: any) {
    if (this.wsClient.readyState !== 1) return;
    this.wsClient.send(
      JSON.stringify({
        action: action,
        data: data,
        ...(raw || {}),
      })
    );
  }
  private _knownAuthToken: string | null = null;
  private _knownClientId: string | null = null;
  private _knownSubscriptions: string | null = null;
  public async sendAuth() {
    if (!this.auth.isLoggedIn) return;
    if (this._knownAuthToken !== this.auth.token) {
      this.send("auth", true, {
        auth: this.auth.token,
      });
      this._knownAuthToken = this.auth.token;
    }
    if (
      this._knownClientId !== this.auth.clientId ||
      this._knownSubscriptions !== this.subscriptions.join(",")
    ) {
      this.send(
        "CLIENTSTATECHANGE",
        {
          clientId: this.auth.clientId,
          subscribe: this.subscriptions,
        },
        {
          auth: this.auth.isLoggedIn ? this.auth.token : undefined,
        }
      );
      (this._knownClientId = this.auth.clientId),
        (this._knownSubscriptions = this.subscriptions.join(","));
    }
  }
  public ping() {
    if (!this.connected) return;
    if (this.wsClient === undefined) {
      if (window.bsb.betterportal !== undefined)
        window.bsb.betterportal.ws.ping();
      return;
    }
    let nav: any = {};
    if (window.navigator !== null && window.navigator !== null) {
      for (let navKey of Object.keys(window.navigator))
        nav[navKey] = (window as any).navigator[navKey];
    }
    this.send(
      "ws-ping",
      {
        navigator: nav,
        time: new Date().getTime(),
        page: window.location,
        //session: Vue.prototype.$_boot
      },
      {
        auth: this.auth.isLoggedIn ? this.auth.token : undefined,
      }
    );
    this.sendAuth();
  }
  public async connect() {
    this.storage.delete("session");
    this.storage.delete("connected");
    const appConfig = await this.whoAmI.getApp();
    if (
      appConfig.servers.ws === undefined ||
      appConfig.servers.ws.enabled === false
    )
      return;
    this.wsClient = new WebSocket(appConfig.servers.ws.url);
    const self = this;
    this.wsClient.onopen = function (e) {
      self.storage.set("connected", true);
      console.log("[open] Connection established");
      if (self.timer !== null) clearInterval(self.timer);
      self.timer = setInterval(() => {
        self.ping();
      }, 60000);
      self.ping();
    };

    this.wsClient.onmessage = function (event) {
      console.log(`[message] Data received from server:`);
      console.log(event);
      if (event === undefined || event === null) return; //Vue.prototype.$log.error("[WS] Events are weird messages");

      if (event.type !== "message") return;
      if (event.data === undefined || event.data === null)
        return; /*Vue.prototype.$log.error(
          "[WS] They`re sending me weird messages"
        );*/

      let message = null;
      try {
        message = JSON.parse(event.data);
        //console.log(message)
      } catch (Exc) {
        return; /*Vue.prototype.$log.error(
          "They`re sending me weird messages (garbage [" +
            event.data +
            "])"
        );*/
      }
      console.log(message);

      if (message.action === undefined || message.action === null)
        return; /*Vue.prototype.$log.error(
          "They`re sending me weird messages (no action)"
        );*/
      if (message.data === undefined || message.data === null)
        return; /*Vue.prototype.$log.error(
          "They`re sending me weird messages (no data)"
        );*/

      if (message.action === "log") {
        if (message.data === "Hello Flightless Bird") {
          //self.sendAuth();
        }
        if (message.data === "UNAuthenticated") {
          setTimeout(() => {
            //self.sendAuth();
          }, 1000);
        }
        if (message.data === "Authenticated") {
          setTimeout(() => {
            //self.sendAuth();
            /*serverAuthenticated = true;
            SendSubState();*/
          }, 5000);
        }
        return; // Vue.prototype.$log.info(`[WS] Log: ${message.data}`);
      }
      if (message.action === "session") {
        console.log("gotsession");
        let sessionId: string | null = `${message.data || ""}`;
        if (sessionId.length < 10) sessionId = null;
        //if (sessionId === null) self.storage.delete("session");
        self.storage.set("session", sessionId);
        //lastSessionUpdate = new Date().getTime();
        //console.log('set session: ' , sessionId)
        //eventBUS.emit("ws-session", sessionId);
        return; // Vue.prototype.$log.info(`[WS] Log: ${message.data}`);
      }

      //eventBUS.emit(`ws-${message.action.toLowerCase()}`, message.data);*/
    };

    this.wsClient.onclose = function (event) {
      self.storage.delete("connected");
      if (event.wasClean) {
        console.log(
          `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
        );
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.log("[close] Connection died");
      }
    };

    this.wsClient.onerror = function (error) {
      console.error(error);
    };
  }
}
