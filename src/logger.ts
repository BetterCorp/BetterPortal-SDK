import { Tools } from "@bettercorp/tools";
import { BetterPortal } from "./betterportal";
import { BetterPortalWindow } from "./globals";
import type { WhoAmIDefinition } from "./whoami";
declare let window: BetterPortalWindow;

export class Logger<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  protected betterportal: BetterPortal<Features, Definition>;
  private appMode: "production" | "development" | "capacitor" = "production";
  constructor(bp: BetterPortal<Features, Definition>) {
    this.betterportal = bp;
  }
  public window(appMode: "production" | "development" | "capacitor") {
    this.appMode = appMode;
    const self = this;
    window.bsb.betterportal.log = {
      info: (...args: Array<any>): void => self.info(...args),
      error: (...args: Array<any>): void => self.error(...args),
      warn: (...args: Array<any>): void => self.warn(...args),
      debug: (...args: Array<any>): void => self.debug(...args),
    };
  }
  private async logConsole(
    level: "error" | "info" | "warn" | "debug",
    ...args: Array<any>
  ) {
    switch (level) {
      case "error":
        console.error(...args);
        return;
      case "info":
        console.info(...args);
        return;
      case "warn":
        console.warn(...args);
        return;
    }
    console.debug(...args);
  }
  private log(
    level: "error" | "info" | "warn" | "debug",
    ...args: Array<any>
  ): void | any {
    const self = this;
    if (level === "debug") {
      if (this.appMode === "development")
        return self.logConsole(level, ...args);
      return;
    }

    setTimeout(async () => {
      if (Tools.isNullOrUndefined(self.betterportal))
        return self.logConsole(level, ...args);
      if (Tools.isNullOrUndefined(self.betterportal.plugins))
        return self.logConsole(level, ...args);
      let loggerPlugin = await self.betterportal.plugins.getPlugin("logger");
      if (loggerPlugin === null) return self.logConsole(level, ...args);
      if (!(await loggerPlugin.isAvailable()))
        return self.logConsole(level, ...args);
      loggerPlugin
        .execute("/bplog", { level: level, args: args })
        .then(() => {})
        .catch(() => {
          self.logConsole(level, ...args);
        });
    }, 1);
  }
  public info(...args: Array<any>) {
    this.log("info", ...args);
  }
  public error(...args: Array<any>) {
    this.log("error", ...args);
  }
  public warn(...args: Array<any>) {
    this.log("warn", ...args);
  }
  public debug(...args: Array<any>) {
    this.log("debug", ...args);
  }
}
