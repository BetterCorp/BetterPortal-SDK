import { DB, Storage } from "./storage";
import { Request } from "./request";
import { WS } from "./ws";
import type { AxiosResponse } from "axios";
import type { BetterPortalWindow } from "./globals";
import { WhoAmI, type WhoAmIDefinition } from "./whoami";
import * as oauth from "oauth4webapi";
declare let window: BetterPortalWindow;

export interface AuthToken {
  tenantId: string;
  appUrl: string;
  appId: string;
  authedAppId: string;
  userId: string;
  name: string;
  surname: string;
  //email: string;
  //cell: string;
  client: Client;
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
  id: string;
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
    return this.user!.client;
  }
  get clientId(): string | null {
    if (!this.isLoggedIn) return null;
    return this.user!.client.id;
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
  /*public selectClient(clientId: string): boolean {
    if (!this.isLoggedIn) return false;
    if (this.user!.clients[clientId] === undefined) return false;
    this.storage.set("client", clientId);
    if (window.bsb.betterportal !== undefined)
      window.bsb.betterportal.events.emit("_client", clientId);
    return true;
  }*/
  /*private async discoveryRequest(issuerIdentifier: URL, options?: oauth.DiscoveryRequestOptions) {
    if (!(issuerIdentifier instanceof URL)) {
        throw new TypeError('"issuerIdentifier" must be an instance of URL');
    }
    if (issuerIdentifier.protocol !== 'https:' && issuerIdentifier.protocol !== 'http:') {
        throw new TypeError('"issuer.protocol" must be "https:" or "http:"');
    }
    const url = new URL(issuerIdentifier.href);
    switch (options?.algorithm) {
        case undefined:
        case 'oidc':
            url.pathname = `${url.pathname}/.well-known/openid-configuration`.replace('//', '/');
            break;
        case 'oauth2':
            if (url.pathname === '/') {
                url.pathname = `.well-known/oauth-authorization-server`;
            }
            else {
                url.pathname = `.well-known/oauth-authorization-server/${url.pathname}`.replace('//', '/');
            }
            break;
        default:
            throw new TypeError('"options.algorithm" must be "oidc" (default), or "oauth2"');
    }
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return fetch(url.href, {
        headers,
        method: 'GET',
        redirect: 'manual',
        signal: options?.signal ? signal(options.signal) : null,
    }).then(processDpopNonce);
}*/
  public async login(): Promise<void> {
    //const self = this;
    const authURL = await Request.getAxiosBaseURL("auth");
    console.log("auth too: " + authURL);
    const issuer = new URL(authURL);
    console.log("auth issx: ", issuer);
    const discovIss = await oauth.discoveryRequest(issuer, {
      algorithm: "oauth2",
    });
    console.log("auth oauth: ", issuer);
    const procIss = await oauth.processDiscoveryResponse(issuer, discovIss);
    console.log("proc oauth: ", issuer);

    const appConfig = await new WhoAmI<Features, Definition>().getApp();

    console.log("auth as:" + authURL);
    const client: oauth.Client = {
      client_id: appConfig.appId,
      token_endpoint_auth_method: "none",
    };

    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop: string) => searchParams.get(prop),
    }) as any as { redirectFrom?: string };

    const redirect_uri =
      params.redirectFrom || window.location.origin + window.location.pathname;

    console.log("redirect from:" + redirect_uri);
    if (procIss.code_challenge_methods_supported?.includes("S256") !== true) {
      // This example assumes S256 PKCE support is signalled
      // If it isn't supported, random `state` must be used for CSRF protection.
      throw new Error("S256 not supposed");
    }
    console.log("code_verifierx");
    const code_verifier = oauth.generateRandomCodeVerifier();
    new Storage("oauth").set("code_verifierx", code_verifier);
    //console.log('code_verifier',code_verifier)
    const code_challenge = await oauth.calculatePKCECodeChallenge(
      code_verifier
    );
    const code_challenge_method = "S256";

    {
      // redirect user to as.authorization_endpoint

      console.log("start auth to: " + procIss.authorization_endpoint!);
      const authorizationUrl = new URL(procIss.authorization_endpoint!);
      authorizationUrl.searchParams.set("client_id", client.client_id);
      authorizationUrl.searchParams.set("code_challenge", code_challenge);
      authorizationUrl.searchParams.set(
        "code_challenge_method",
        code_challenge_method
      );
      authorizationUrl.searchParams.set("redirect_uri", redirect_uri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", "openid profile");
      console.log("redirect auth to: " + authorizationUrl.toString());
      window.location.href = authorizationUrl.toString();
    }
  }
  public async loginFinalize() {
    const authURL = await Request.getAxiosBaseURL("auth");
    console.log("auth too: " + authURL);
    const issuer = new URL(authURL);
    console.log("auth issx: ", issuer);
    const discovIss = await oauth.discoveryRequest(issuer, {
      algorithm: "oauth2",
    });
    console.log("auth oauth: ", issuer);
    const procIss = await oauth.processDiscoveryResponse(issuer, discovIss);
    console.log("proc oauth: ", issuer);
    const currentUrl: URL = new URL(window.location.href);
    const appConfig = await new WhoAmI<Features, Definition>().getApp();
    const client: oauth.Client = {
      client_id: appConfig.appId,
      token_endpoint_auth_method: "none",
    };
    const parameters = oauth.validateAuthResponse(
      procIss,
      client,
      currentUrl,
      oauth.expectNoState
    );
    if (oauth.isOAuth2Error(parameters)) {
      console.log("error", parameters);
      throw new Error(); // Handle OAuth 2.0 redirect error
    }

    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop: string) => searchParams.get(prop),
    }) as any as { redirectFrom?: string };

    const redirect_uri =
      params.redirectFrom || window.location.origin + window.location.pathname;
    const response = await oauth.authorizationCodeGrantRequest(
      procIss,
      client,
      parameters,
      redirect_uri,
      new Storage("oauth").get("code_verifierx") || "XX"
    );

    let challenges: oauth.WWWAuthenticateChallenge[] | undefined;
    if ((challenges = oauth.parseWwwAuthenticateChallenges(response))) {
      for (const challenge of challenges) {
        console.log("challenge", challenge);
      }
      throw new Error(); // Handle www-authenticate challenges as needed
    }

    const result = await oauth.processAuthorizationCodeOAuth2Response(
      procIss,
      client,
      response
    );
    if (oauth.isOAuth2Error(result)) {
      console.log("error", result);
      throw result; // Handle OAuth 2.0 response body error
    }

    console.log("result", result);
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
    if (resp === undefined || resp === null)
      return fail({
        status: AuthResponse.INVALID_DATA,
        message: "Request Error",
      });
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
