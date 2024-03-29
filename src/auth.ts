import { DB, Storage } from "./storage";
import { Request } from "./request";
//import { WS } from "./ws";
//import type { AxiosResponse } from "axios";
import type { BetterPortalWindow } from "./globals";
import { WhoAmI, type WhoAmIDefinition } from "./whoami";
import * as oauth from "oauth4webapi";
import { Tools } from "@bettercorp/tools";
import { IDictionary } from "@bettercorp/tools/lib/Interfaces";
import { Capacitor } from "./capacitor";
import { Logger } from './logger';
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

export interface OAuthAccessToken {
  clientId?: string;
  clientName?: string;
  clientPermissions?: IDictionary<Array<string>>;
  verified: boolean;
  name: string;
  surname: string;
  email: string;
  userId: string;
  appId: string;
  tenantId: string;
  ip: string;
  cid: string;
  scope: string;
  sub: string;
  exp: number;
  expMS: number;
  nbf: number;
  iat: number;
  jti: string;
  issuer: string;
}

export interface OAuthRefreshToken {
  expMS: number;
  client_id: string;
  access_token_id: string;
  refresh_token_id: string;
  scope: string;
  user_id: string;
  expire_time: number;
  subject: string;
  issuer: string;
  iat: number;
}

export class Auth<
  Features,
  Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
> {
  private storage: Storage<Features, Definition>;
  //private ws: WS<Features, Definition>;
  private timer: NodeJS.Timer | null = null;
  private logger: Logger<
  Features,
  Definition>;
  constructor(logger: Logger<
    Features,
    Definition>) {
    this.logger = logger;
    this.storage = new Storage(logger, "auth", false);
    //this.ws = new WS(undefined, true);
    if (this.isLoggedIn && this.accessToken !== null) {
      let now = new Date().getTime();
      if (this.accessToken.expMS < now) {
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
      self.logger.debug("refresh run");
      //if (self.isLoggedIn)
      await self.refresh();
    }, 5 * 60 * 1000);
    self.logger.debug("refresh run");
    await self.refresh();
  }
  /*get client(): Client | null {
    if (!this.isLoggedIn) return null;
    return this.user!.client;
  }*/
  get clientId(): string | null {
    if (!this.isLoggedIn) return null;
    if (!this.accessToken) return null;
    return this.accessToken.clientId ?? null;
  }
  get clientName(): string | null {
    if (!this.isLoggedIn) return null;
    if (!this.accessToken) return null;
    return this.accessToken.clientName ?? null;
  }
  // get user(): AuthToken | null {
  //   return this.storage.get<AuthToken>("user");
  // }
  get accessToken(): OAuthAccessToken | null {
    return this.storage.get<OAuthAccessToken>("access_token");
  }
  get accessTokenString(): string | null {
    return this.storage.get<string>("oauth_access_token");
  }
  get refreshToken(): OAuthRefreshToken | null {
    return this.storage.get<OAuthRefreshToken>("refresh_token");
  }
  get refreshTokenString(): string | null {
    return this.storage.get<string>("oauth_refresh_token");
  }
  // get idToken(): string | null {
  //   return this.storage.get<string>("oauth_id_token");
  // }
  get isLoggedIn(): boolean {
    return this.accessTokenString !== null;
  }
  private async getOAuthHeaders(): Promise<Headers> {
    let headers = new Headers();
    const appConfig = await new WhoAmI<Features, Definition>(this.logger).getApp();
    headers.append("referer", appConfig.config.hostname);
    return headers;
  }
  public async logout(
    revokeTokens: boolean = true,
    logoutRedirect: boolean = true
  ): Promise<void> {
    if (window.bsb.betterportal !== undefined) {
      window.bsb.betterportal.events.emit("_auth", null);
      window.bsb.betterportal.events.emit("_client", null);
    }
    const authURL = await Request.getAxiosBaseURL(this.logger, "auth");
    this.logger.debug("auth too: " + authURL);
    const issuer = new URL(authURL);
    this.logger.debug("auth issx: ", issuer);
    const discovIss = await oauth.discoveryRequest(issuer, {
      algorithm: "oauth2",
      headers: await this.getOAuthHeaders(),
    });
    this.logger.debug("auth oauth: ", issuer);
    const procIss = await oauth.processDiscoveryResponse(issuer, discovIss);
    this.logger.debug("proc oauth: ", issuer);
    const appConfig = await new WhoAmI<Features, Definition>(this.logger).getApp();
    const client: oauth.Client = {
      client_id: appConfig.appId,
      token_endpoint_auth_method: "none",
    };
    if (
      revokeTokens &&
      !Tools.isNullOrUndefined(this.accessTokenString) &&
      !Tools.isNullOrUndefined(this.refreshTokenString)
    )
    this.logger.warn(
        await oauth.revocationRequest(procIss, client, this.accessTokenString, {
          additionalParameters: new URLSearchParams(
            `refresh_token=${encodeURIComponent(this.refreshTokenString)}`
          ),
          headers: await this.getOAuthHeaders(),
        })
      );
    /*if (!Tools.isNullOrUndefined(this.accessTokenString))
      self.logger.warn(
        await oauth.revocationRequest(procIss, client, this.accessTokenString)
      );*/
    /*if (!Tools.isNullOrUndefined(this.idToken))
      self.logger.warn(
        await oauth.revocationRequest(procIss, client, this.idToken)
      );*/
    this.storage.delete("original_url");
    this.storage.delete("oauth_refresh_token");
    this.storage.delete("oauth_access_token");
    this.storage.delete("oauth_id_token");
    this.storage.delete("refresh_token");
    this.storage.delete("access_token");
    this.storage.delete("id_token");
    if (logoutRedirect)
      window.location.href = `${
        procIss.authorization_endpoint
      }?action=logout&client_id=${
        appConfig.appId
      }&redirect_uri=${encodeURIComponent(window.location.href)}`;
    //oauth.revocationRequest
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
  public async doAction(
    action: string,
    meta?: Array<Record<string, string | number>>
  ): Promise<boolean> {
    return await this.oauthRedirect(action, meta);
  }
  public async login(): Promise<boolean> {
    return await this.oauthRedirect();
  }
  private async oauthRedirect(
    action?: string,
    meta?: Array<Record<string, string | number>>
  ): Promise<boolean> {
    //const self = this;
    const authURL = await Request.getAxiosBaseURL(this.logger, "auth");
    this.logger.debug("auth too: " + authURL);
    const issuer = new URL(authURL);
    this.logger.debug("auth issx: ", issuer);
    const discovIss = await oauth.discoveryRequest(issuer, {
      algorithm: "oauth2",
      headers: await this.getOAuthHeaders(),
    });
    this.logger.debug("auth oauth: ", issuer);
    const procIss = await oauth.processDiscoveryResponse(issuer, discovIss);
    this.logger.debug("proc oauth: ", issuer);

    const appConfig = await new WhoAmI<Features, Definition>(this.logger).getApp();

    this.logger.debug("auth as:" + authURL);
    if (procIss.code_challenge_methods_supported?.includes("S256") !== true) {
      // This example assumes S256 PKCE support is signalled
      // If it isn't supported, random `state` must be used for CSRF protection.
      throw new Error("S256 not supposed");
    }

    const sParams = new URLSearchParams(window.location.search);
    const params = new Proxy(sParams, {
      get: (searchParams, prop: string) => searchParams.get(prop),
    }) as any as IDictionary<string | undefined>;

    const redirect_uri =
      params.redirectFrom || window.location.origin + window.location.pathname;
      this.logger.debug("redirect from:" + redirect_uri);

    if (window.bsb.betterportal.mode === "capacitor") {
      this.logger.debug("redirect from: AUTH POPUP");
      let additionalParameters: {
        [key: string]: string;
      } = {};
      if (!Tools.isNullOrUndefined(action)) {
        additionalParameters["action"] = action;
        if (!Tools.isNullOrUndefined(meta)) {
          additionalParameters["actionmeta"] = Buffer.from(
            JSON.stringify(meta),
            "utf-8"
          ).toString("base64");
        }
      }
      let resp = await Capacitor.triggerOAuthMobile({
        additionalParameters: additionalParameters,
        logsEnabled: true,
        appId: appConfig.appId,
        pkceEnabled: true,
        //pkceDisable: false,
        authorizationBaseUrl: procIss.authorization_endpoint,
        accessTokenEndpoint: procIss.token_endpoint,
        scope: "openid profile",
        //resourceUrl: procIss.userinfo_endpoint,
        responseType: "code",
        redirectUrl: "cloud.betterportal.mobile:/",
        // web: {
        //   pkceEnabled: true,
        //   responseType: "code",
        //   redirectUrl: redirect_uri,
        //   windowOptions: "height=600,left=0,top=0"
        // },
        android: {
          //appId: appConfig.appId,
          //pkceEnabled: true,
          //responseType: "code",
          //redirectUrl: "cloud.betterportal.mobile:/",
        },
        ios: {
          //appId: appConfig.appId,
          //pkceEnabled: true,
          //responseType: "code",
          //redirectUrl: "cloud.betterportal.mobile:/",
        },
      });
      this.logger.debug(resp);
      await this.parseTokenResult(
        resp.access_token_response ?? { error: resp }
      );
      return true;
    }

    const client: oauth.Client = {
      client_id: appConfig.appId,
      token_endpoint_auth_method: "none",
    };

    this.logger.debug("code_verifierx");
    const code_verifier = oauth.generateRandomCodeVerifier();
    const state = oauth.generateRandomState();
    this.storage.set("oauth_code_verifierx", code_verifier);
    this.storage.set("oauth_code_statex", state);
    //self.logger.debug('code_verifier',code_verifier)
    const code_challenge = await oauth.calculatePKCECodeChallenge(
      code_verifier
    );
    const code_challenge_method = "S256";

    {
      // redirect user to as.authorization_endpoint
      this.logger.debug("start auth to: " + procIss.authorization_endpoint!);
      const authorizationUrl = new URL(procIss.authorization_endpoint!);
      authorizationUrl.searchParams.set("client_id", client.client_id);
      authorizationUrl.searchParams.set("code_challenge", code_challenge);
      authorizationUrl.searchParams.set(
        "code_challenge_method",
        code_challenge_method
      );
      authorizationUrl.searchParams.set("redirect_uri", redirect_uri);
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", "openid profile");
      if (!Tools.isNullOrUndefined(action)) {
        authorizationUrl.searchParams.set("action", action);
        if (!Tools.isNullOrUndefined(meta)) {
          authorizationUrl.searchParams.set(
            "actionmeta",
            Buffer.from(JSON.stringify(meta), "utf-8").toString("base64")
          );
        }
      }
      let endAuthUrl = authorizationUrl.toString();
      this.logger.debug("Auth redirect auth to: " + endAuthUrl);
      for (let objKeyA of sParams) {
        const key = objKeyA[0];
        const value = objKeyA[1];
        if (key == "redirectFrom") continue;
        if (!Tools.isString(value)) continue;
        if (value.length < 2) continue;
        endAuthUrl += endAuthUrl.indexOf("?") > 0 ? "&" : "?";
        endAuthUrl += "bp_" + key + "=" + encodeURIComponent(value);
      }
      window.location.href = endAuthUrl;
    }
    return false; // probs will never be reached, but just in case
  }
  public async loginFinalize() {
    const authURL = await Request.getAxiosBaseURL(this.logger, "auth");
    this.logger.debug("auth too: " + authURL);
    const issuer = new URL(authURL);
    this.logger.debug("auth issx: ", issuer);
    const discovIss = await oauth.discoveryRequest(issuer, {
      algorithm: "oauth2",
      headers: await this.getOAuthHeaders(),
    });
    this.logger.debug("auth oauth: ", issuer);
    const procIss = await oauth.processDiscoveryResponse(issuer, discovIss);
    this.logger.debug("proc oauth: ", issuer);
    const currentUrl: URL = new URL(window.location.href);
    const appConfig = await new WhoAmI<Features, Definition>(this.logger).getApp();
    const client: oauth.Client = {
      client_id: appConfig.appId,
      token_endpoint_auth_method: "none",
    };
    const parameters = oauth.validateAuthResponse(
      procIss,
      client,
      currentUrl,
      this.storage.get("oauth_code_statex") || "XX"
    );
    if (oauth.isOAuth2Error(parameters)) {
      this.logger.error("error", parameters);
      throw new Error("Authentication redirect error"); // Handle OAuth 2.0 redirect error
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
      this.storage.get("oauth_code_verifierx") || "XX",
      {
        headers: await this.getOAuthHeaders(),
      }
    );

    let challenges: oauth.WWWAuthenticateChallenge[] | undefined;
    if ((challenges = oauth.parseWwwAuthenticateChallenges(response))) {
      for (const challenge of challenges) {
        this.logger.debug("challenge", challenge);
      }
      throw new Error("Auth challenge error"); // Handle www-authenticate challenges as needed
    }

    const result = await oauth.processAuthorizationCodeOAuth2Response(
      procIss,
      client,
      response
    );

    this.storage.delete("oauth_code_verifierx");
    this.storage.delete("oauth_code_statex");
    this.parseTokenResult(result);
  }
  private parseTokenResult(
    result:
      | oauth.OAuth2Error
      | oauth.OAuth2TokenEndpointResponse
      | oauth.TokenEndpointResponse
  ) {
    if (oauth.isOAuth2Error(result)) {
      this.logger.error("error", result);
      throw result; // Handle OAuth 2.0 response body error
    }

    this.logger.debug("result", result);
    if (result.token_type.toLowerCase() !== "bearer")
      throw "Unable to process authenticated token";
    this.storage.set("oauth_access_token", result.access_token);
    let jwt = this.parseJwt(result.access_token);
    jwt.expMS = jwt.exp * 1000;
    this.storage.set("access_token", jwt);
    window.bsb.betterportal.events.emit("_auth", true);
    window.bsb.betterportal.events.emit(
      "_client",
      this.accessToken!.clientId ?? null
    );
    if (!Tools.isNullOrUndefined(result.refresh_token)) {
      this.storage.set("oauth_refresh_token", result.refresh_token);
      let rjwt = this.parseJwt(result.refresh_token);
      rjwt.expMS = rjwt.expire_time * 1000;
      this.storage.set("refresh_token", rjwt);
    }
    if (!Tools.isNullOrUndefined(result.id_token)) {
      this.storage.set("oauth_id_token", result.id_token);
      this.storage.set("id_token", this.parseJwt(result.id_token));
    }
  }
  /*private handleAuthResponse(resp: AxiosResponse): {
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
  }*/
  private parseJwt(token: string) {
    var base64Url = token.split(".")[1];
    var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    var jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  }
  private async refresh(): Promise<void> {
    try {
      if (!this.isLoggedIn) return;
      if (this.accessToken === null) return;
      if (this.refreshToken === null) return;
      if (this.accessTokenString === null) return;
      if (this.refreshTokenString === null) return;
      let now = new Date().getTime();
      if (this.accessToken.expMS <= now || this.refreshToken.expMS <= now) {
        this.logger.warn(
          ` - tokens have expired, lets just cleanup (accessToken:${
            (this.accessToken.expMS - now) / 1000
          }s) (refreshToken:${(this.refreshToken.expMS - now) / 1000}s)`
        );
        await this.logout(false, false);
        window.location.reload();
        return;
      }
      let nowRF = now + 5 * 60 * 1000;
      if (this.accessToken.expMS > nowRF && this.refreshToken.expMS > nowRF)
        return this.logger.debug(
          ` - too early to refresh (accessToken:${
            (this.accessToken.expMS - nowRF) / 1000
          }s) (refreshToken:${(this.refreshToken.expMS - nowRF) / 1000}s)`
        );
        this.logger.debug(
        ` - refresh token (accessToken:${
          (this.accessToken.expMS - nowRF) / 1000
        }s) (refreshToken:${(this.refreshToken.expMS - nowRF) / 1000}s)`
      );
      const authURL = await Request.getAxiosBaseURL(this.logger, "auth");
      this.logger.debug("auth too: " + authURL);
      const issuer = new URL(authURL);
      this.logger.debug("auth issx: ", issuer);
      const discovIss = await oauth.discoveryRequest(issuer, {
        algorithm: "oauth2",
        headers: await this.getOAuthHeaders(),
      });
      this.logger.debug("auth oauth: ", issuer);
      const procIss = await oauth.processDiscoveryResponse(issuer, discovIss);
      this.logger.debug("proc oauth: ", issuer);
      const appConfig = await new WhoAmI<Features, Definition>(this.logger).getApp();
      const client: oauth.Client = {
        client_id: appConfig.appId,
        token_endpoint_auth_method: "none",
      };
      let refreshReq = await oauth.refreshTokenGrantRequest(
        procIss,
        client,
        this.refreshTokenString,
        {
          headers: await this.getOAuthHeaders(),
        }
      );
      let refreshResp = await oauth.processRefreshTokenResponse(
        procIss,
        client,
        refreshReq
      );
      this.parseTokenResult(refreshResp);
      this.logger.debug(refreshResp);
      /*const userRequest = await oauth.userInfoRequest(
        procIss,
        client,
        this.accessTokenString
      );
      if (userRequest.status === 202) {
      }
      let resp = await (
        await Request.getAxios("auth")
      ).patch("/auth", {
        session: this.ws.sessionId,
      });
      const respAuth = this.handleAuthResponse(resp);
      if (respAuth.status == AuthResponse.ACCEPTED) return;
      self.logger.warn("user logged out");
      this.logout();*/
    } catch (exc) {
      this.logger.error(exc);
      await this.login();
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
