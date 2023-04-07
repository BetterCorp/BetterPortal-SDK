//import { Tools } from "@bettercorp/tools/lib/Tools";
//import { App } from "vue";
import type { Router } from "vue-router";
import type { ServiceRouteExpanded } from "./plugin";
import { BetterPortalWindow } from "./globals";
import { Tools } from "@bettercorp/tools";
declare let window: BetterPortalWindow;
//import { ServiceRoute } from "./whoami";

/*export interface VueRouterOptions {
  router: Router;
  routes: Array<ServiceRoute>;
  layoutComponent: any;
}*/

/*
{
  path: "/App/Client",
  name: "client",
  component: DefaultLayout,
  meta: {
    content: Client,
    breadcrumbs: ["App", "Login", "Client"],
    lockedScroll: true,
  },
},
*/

export class Vue {
  public static router(
    router: Router,
    routes: Array<ServiceRouteExpanded>,
    layoutComponent: any
  ) {
    for (let route of routes) {
      if (
        !Tools.isNullOrUndefined(window.bsb) &&
        !Tools.isNullOrUndefined(window.bsb.betterportal) &&
        !Tools.isNullOrUndefined(window.bsb.betterportal.log)
      ) {
        window.bsb.betterportal.log.debug(
          "add route:" + route.name,
          route.path
        );
      }
      router.addRoute({
        path: route.path,
        name: route.name,
        component: layoutComponent,
        meta: {
          bsbRoute: route,
          breadcrumbs: route.crumbs,
          ...(route.meta || {}),
        },
      });
    }
  }

  /*constructor(app: App<Element>, options: VueOptions) {
    self.logger.debug("ready setup");
    app.use(this, options);
  }
  public install(app: App<Element>, options: VueOptions) {
    if (Tools.isNullOrUndefined(app)) throw "Undefined/Null APP";
    if (Tools.isNullOrUndefined(options)) throw "Undefined/Null Options";
    if (Tools.isNullOrUndefined(options.router))
      throw "Undefined/Null [router] Options";
    if (Tools.isNullOrUndefined(options.routes))
      throw "Undefined/Null [routes] Options";
    if (Tools.isNullOrUndefined(options.layoutComponent))
      throw "Undefined/Null [layoutComponent] Options";

    for (let route of options.routes) {
      self.logger.debug("add route:" + route.name, route.path);
      options.router.addRoute({
        path: route.path,
        name: route.name,
        component: options.layoutComponent,
        meta: {
          bsbRoute: route,
          breadcrumbs: route.crumbs,
          ...(route.meta || {})
        },
      });
    }
  }*/
}

export * from "./vue/index";
