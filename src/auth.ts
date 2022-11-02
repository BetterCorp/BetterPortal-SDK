import { DB, Storage } from "./storage";
import { Request } from "./request";
import { WS } from "./ws";
import type { AxiosResponse } from "axios";
import type { BetterPortalWindow } from "./globals";
import type { WhoAmIDefinition } from "./whoami";
declare let window: BetterPortalWindow;

export interface AuthToken {
  tenantId: string;
  appId: string;
  authedAppId: string;
  userId: string;
  name: string;
  surname: string;
  email: string;
  cell: string;
  clients: { [key: string]: Client };
  sessionStarted: number;
  sessionKey: string;
  last2FATime: number;
  has2FASetup: boolean;
  expires: number;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
}

export interface Client {
  name: string;
  enabled: boolean;
  sar: Sar;
}

export interface Sar {
  _: string[];
}

export interface AuthRequest {
  //session: string;
  resetToken?: string;
  email: string;
  password?: string;
  optToken?: string;
  emailToken?: string;
  whatsappToken?: string;
  firstName?: string;
  lastName?: string;
  cell?: string;
}

export enum AuthResponse {
  INVALID_DATA = "Invalid Data",
  APP_OR_TENANT_DISABLED = "App or Tenant Disabled",
  USER_NOT_FOUND = "User not found",
  OTP_VALIDATION = "Requires OTP validation",
  SERVER_ERROR = "Server error",
  VALIDATION_REQUIRED = "Validation required",
  YOURATEAPOT = "Invalid OTP data",
  TWOFA_REQUIRED = "2FA required",
  ACCEPTED = "Accepted",
}

export interface AuthDB extends DB {}

export class Auth<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  private storage: Storage;
  private ws: WS<Features, Definition>;
  private timer: NodeJS.Timer | null = null;
  constructor() {
    this.storage = new Storage("auth");
    this.ws = new WS(undefined, true);
    if (this.isLoggedIn) {
      let now = new Date().getTime();
      if (this.user!.expires < now) {
        this.logout();
      }
    }
  }
  public dispose() {
    if (this.timer !== null) clearInterval(this.timer);
  }
  public async window() {
    const self = this;
    this.timer = setInterval(async () => {
      if (self.isLoggedIn) await self.refresh();
    }, 5 * 60 * 1000);
    await self.refresh();
  }
  get client(): Client | null {
    if (!this.isLoggedIn) return null;
    if (this.clientId === null) return null;
    return this.user!.clients[this.clientId];
  }
  get clientId(): string | null {
    return this.storage.get<string>("client");
  }
  get user(): AuthToken | null {
    return this.storage.get<AuthToken>("user");
  }
  get token(): string | null {
    return this.storage.get<string>("token");
  }
  get isLoggedIn(): boolean {
    return this.storage.get<string>("token") !== null;
  }
  public logout(): void {
    this.storage.delete("token");
    this.storage.delete("client");
    this.storage.delete("user");
    if (window.bsb.betterportal !== undefined) {
      window.bsb.betterportal.events.emit("_auth", null);
      window.bsb.betterportal.events.emit("_client", null);
    }
  }
  public selectClient(clientId: string): boolean {
    if (!this.isLoggedIn) return false;
    if (this.user!.clients[clientId] === undefined) return false;
    this.storage.set("client", clientId);
    if (window.bsb.betterportal !== undefined)
      window.bsb.betterportal.events.emit("_client", clientId);
    return true;
  }
  public async login(auth: AuthRequest): Promise<{
    status: AuthResponse;
    message?: string;
  }> {
    let resp = await (
      await Request.getAxios("auth")
    ).post("/auth", {
      ...auth,
      session: this.ws.sessionId,
    });
    return this.handleAuthResponse(resp);
  }
  private handleAuthResponse(resp: AxiosResponse): {
    status: AuthResponse;
    message?: string;
  } {
    const self = this;
    const fail = (x: { status: AuthResponse; message?: string }) => {
      self.logout();
      return x;
    };
    if (resp.status === 400)
      return fail({ status: AuthResponse.INVALID_DATA, message: resp.data });
    if (resp.status === 403)
      return fail({
        status: AuthResponse.APP_OR_TENANT_DISABLED,
        message: resp.data,
      });
    if (resp.status === 418)
      return fail({ status: AuthResponse.YOURATEAPOT, message: resp.data });
    if (resp.status === 500)
      return fail({ status: AuthResponse.SERVER_ERROR, message: resp.data });
    if (resp.status === 404)
      return fail({ status: AuthResponse.USER_NOT_FOUND, message: resp.data });
    if (resp.status === 201)
      return fail({ status: AuthResponse.OTP_VALIDATION, message: resp.data });
    if (resp.status === 408)
      return fail({
        status: AuthResponse.VALIDATION_REQUIRED,
        message: resp.data,
      });
    if (resp.status === 206)
      return fail({ status: AuthResponse.TWOFA_REQUIRED, message: resp.data });
    if (resp.status === 202) {
      this.storage.set("token", resp.data.token);
      this.storage.set<AuthToken>("user", resp.data);
      if (window.bsb.betterportal !== undefined)
        window.bsb.betterportal.events.emit("_auth", resp.data);
      return { status: AuthResponse.ACCEPTED, message: resp.data };
    }
    fail({} as any);
    throw "Unknown Response from server";
  }
  private async refresh(): Promise<void> {
    try {
      if (!this.isLoggedIn) return;
      let resp = await (
        await Request.getAxios("auth")
      ).patch("/auth", {
        session: this.ws.sessionId,
      });
      const respAuth = this.handleAuthResponse(resp);
      if (respAuth.status == AuthResponse.ACCEPTED) return;
      console.warn("user logged out");
      this.logout();
    } catch (exc) {
      console.error(exc);
    }
  }

  /*async getApp<T extends WhoAmIDefinition = WhoAmIDefinition>(
    host: string = "https://whoami.betterportal.cloud"
  ): Promise<T> {
    let storedData = this.storage.get<ConfigStore<T>>("config");
    if (storedData !== null) {
      let nowBF = new Date().getTime() - 5 * 60 * 1000;
      if (storedData.time > nowBF) return storedData.data;
    }
    let resp = await axios.get(host + "/app");
    if (resp.status !== 200) throw "Invalid APP";
    resp.data.appConfig = resp.data.appConfig || {};
    this.storage.set<ConfigStore>("config", {
      data: resp.data,
      time: new Date().getTime(),
    });
    return resp.data;
  }*/
}
