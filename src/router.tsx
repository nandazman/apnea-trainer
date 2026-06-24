import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { Root } from "./routes/Root";
import { Trainer } from "./routes/Trainer";

const rootRoute = createRootRoute({ component: Root });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Trainer });
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: lazyRouteComponent(() => import("./routes/History"), "History"),
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: lazyRouteComponent(() => import("./routes/SettingsPage"), "SettingsPage"),
});

const routeTree = rootRoute.addChildren([indexRoute, historyRoute, settingsRoute]);

// ponytail: hash history sidesteps GitHub Pages SPA 404s on refresh — no 404.html redirect hack needed.
export const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
