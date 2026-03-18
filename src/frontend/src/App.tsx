import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import GamePage from "./pages/GamePage";
import HistoryPage from "./pages/HistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import StaffPage from "./pages/StaffPage";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: LobbyPage,
});

const gamesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/games",
  component: LobbyPage,
});

const gameRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/game/$gameType",
  component: GamePage,
});

const historyRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/history",
  component: HistoryPage,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/leaderboard",
  component: LeaderboardPage,
});

const staffRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/staff",
  component: StaffPage,
});

const routeTree = rootRoute.addChildren([
  authRoute,
  layoutRoute.addChildren([
    indexRoute,
    gamesRoute,
    gameRoute,
    historyRoute,
    leaderboardRoute,
    staffRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" theme="dark" />
    </>
  );
}
