import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import AuthPage from "./pages/AuthPage";
import GamePage from "./pages/GamePage";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
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

// Public layout — no auth redirect
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "public-layout",
  component: PublicLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/",
  component: HomePage,
});

// Auth-protected layout
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: Layout,
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
  publicLayoutRoute.addChildren([indexRoute]),
  layoutRoute.addChildren([
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
