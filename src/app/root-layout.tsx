import { Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../design-system/app-shell";

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <AppShell currentPathname={pathname}>
      <Outlet />
    </AppShell>
  );
}
