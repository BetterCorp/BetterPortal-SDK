import axios from "axios";
import type { CreateAxiosDefaults } from "axios";
import { WhoAmI } from "./whoami";
import type { WhoAmIDefinition } from "./whoami";
import { Storage } from "./storage";
import { Auth } from "./auth";

export class Request {
  public static setHost(myHost: string) {
    if (myHost === "") new Storage<string>("_base").delete("host");
    else new Storage<string>("_base").set("host", myHost);
  }
  public static async getAxiosBaseURL<
    Features,
    Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
  >(service?: string, specificBaseHost?: string) {
    if (service === "whoami") {
      return specificBaseHost || "https://whoami.betterportal.cloud";
    }
    const appConfig = await new WhoAmI<Features, Definition>().getApp();

    if (
      service !== undefined &&
      appConfig.servers[service] !== undefined &&
      appConfig.servers[service].enabled !== false
    )
      return appConfig.servers[service].url;

    return specificBaseHost || "httpx://never.never";
  }
  public static async getAxios<
    Features,
    Definition extends WhoAmIDefinition<Features> = WhoAmIDefinition<Features>
  >(service?: string, specificBaseHost?: string) {
    let axiosConfig: CreateAxiosDefaults<any> = {
      headers: {},
      withCredentials: true
    };
    axiosConfig.baseURL = specificBaseHost || "httpx://never.never";

    const _host = new Storage<string>("_base").get("host");
    if (_host !== null) {
      (axiosConfig as any).headers["origin"] = _host;
      (axiosConfig as any).headers["referrer"] = _host;
    }

    if (service === "whoami") {
      axiosConfig.baseURL =
        specificBaseHost ||
        new Storage("whoami", ["host"]).get("host") ||
        "https://whoami.betterportal.cloud";
      return axios.create(axiosConfig);
    }
    const appConfig = await new WhoAmI<Features, Definition>().getApp();

    (axiosConfig as any).headers["tenant-id"] = appConfig.config.tenantId;
    (axiosConfig as any).headers["app-id"] = appConfig.appId;

    const auth = new Auth();
    if (auth.isLoggedIn) {
      (axiosConfig as any).headers["authorization"] = "BPAuth " + auth.accessTokenString;
    }
    if (
      service !== undefined &&
      appConfig.servers[service] !== undefined &&
      appConfig.servers[service].enabled !== false
    )
      axiosConfig.baseURL = appConfig.servers[service].url;

    return axios.create(axiosConfig);
  }
}

/*const getAxiosHeaders = (
  headers,
  auth = true,
  contentType = true,
  accept = true
) => {
  headers = headers || {};
  //headers.Session = Vue.prototype.$_boot.session;
  headers["tenant-id"] = self.$store.getters.tenantId;
  headers["app-id"] = self.$store.getters.appId;
  if (self.$store.getters.isAuthenticated && auth)
    headers["Authorization"] = `BSBAuth ${self.$store.getters.token}`;
  if (
    Object.keys(headers)
      .map((x) => x.toLowerCase())
      .indexOf("content-type") < 0 &&
    contentType
  )
    headers["Content-Type"] = "application/json";
  if (
    Object.keys(headers)
      .map((x) => x.toLowerCase())
      .indexOf("accept") < 0 &&
    accept
  )
    headers["Accept"] = "application/json";
  return headers;
};
*/
