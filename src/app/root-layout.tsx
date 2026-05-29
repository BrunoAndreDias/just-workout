import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Activity, Dumbbell, Home } from "lucide-react";
import { Button } from "../design-system/button";
import { cn } from "../design-system/cn";

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen px-4 py-4 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3 rounded-lg border border-stone-900/10 bg-[#f4f0e8]/82 px-3 py-3 backdrop-blur">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-950 text-stone-50">
              <Dumbbell aria-hidden="true" size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black leading-5">Just Workout</span>
              <span className="block truncate text-xs font-semibold text-stone-600">
                Local training system
              </span>
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1" aria-label="Primary">
            <Button
              asChild
              aria-label="Dashboard"
              className={cn(pathname === "/" && "bg-white")}
              size="icon"
              variant="ghost"
            >
              <Link to="/">
                <Home aria-hidden="true" size={19} />
              </Link>
            </Button>
            <Button
              asChild
              aria-label="Workout"
              className={cn(pathname === "/workout" && "bg-white")}
              size="icon"
              variant="ghost"
            >
              <Link to="/workout">
                <Activity aria-hidden="true" size={19} />
              </Link>
            </Button>
          </nav>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
