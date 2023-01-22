//import { Tools } from "@bettercorp/tools/lib/Tools";
//import { App } from "vue";
import type { Router } from "vue-router";
import type { ServiceRouteExpanded } from "./plugin";
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
      console.log("add " + route.path);
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
    console.log("ready setup");
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
      console.log("add route:" + route.name, route.path);
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
