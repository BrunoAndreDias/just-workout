import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  Dumbbell,
  History,
  Home,
  type LucideIcon,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import "./app-shell.css";

type AppShellProps = {
  children: ReactNode;
  currentPathname: string;
};

type AppShellNavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  largeScreenOnly?: boolean;
};

const appShellNavigationItems = [
  { href: "/", icon: Home, label: "Home", largeScreenOnly: true },
  { href: "/workout", icon: Dumbbell, label: "Workouts", largeScreenOnly: true },
  { href: "/exercise-library", icon: BookOpen, label: "Exercise Library", largeScreenOnly: true },
  { href: "/plan-builder", icon: CalendarCheck, label: "Workout Plan Builder" },
  { href: "/progress", icon: TrendingUp, label: "Progress", largeScreenOnly: true },
  { href: "/history", icon: History, label: "History", largeScreenOnly: true },
  { href: "/settings", icon: Settings, label: "Settings", largeScreenOnly: true },
] as const satisfies ReadonlyArray<AppShellNavigationItem>;

export function AppShell({ children, currentPathname }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#162325]">
      <div className="app-shell-grid grid min-h-screen w-full lg:grid-cols-[var(--jw-sidebar-width)_minmax(0,1fr)]">
        <aside className="border-stone-950/8 bg-[#fbf8f3] px-[var(--jw-sidebar-padding-x)] py-[var(--jw-sidebar-padding-y)] lg:min-h-screen lg:border-r">
          <Link className="flex min-w-0 items-center gap-3" to="/plan-builder">
            <span className="app-shell-brand-mark flex h-[var(--jw-icon-circle-md)] w-[var(--jw-icon-circle-md)] shrink-0 items-center justify-center rounded-md bg-[#00636a] text-white">
              <Dumbbell
                aria-hidden="true"
                className="app-shell-brand-icon h-[var(--jw-icon-md)] w-[var(--jw-icon-md)]"
                strokeWidth={2.4}
              />
            </span>
            <span className="app-shell-brand-name jw-heading-font truncate text-[1.125rem] font-bold leading-none tracking-[var(--jw-heading-tracking)] text-[#075d63]">
              Just Workout
            </span>
          </Link>

          <nav className="mt-6 grid gap-1 lg:mt-12" aria-label="Primary">
            {appShellNavigationItems.map((item) => (
              <AppShellNavigationLink
                currentPathname={currentPathname}
                item={item}
                key={item.href}
              />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-0 lg:py-0 lg:pr-4">{children}</main>
      </div>
    </div>
  );
}

function AppShellNavigationLink({
  currentPathname,
  item,
}: {
  currentPathname: string;
  item: AppShellNavigationItem;
}) {
  const isActive =
    item.href === "/plan-builder"
      ? currentPathname.startsWith(item.href)
      : currentPathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "app-shell-navigation-link group flex min-h-[var(--jw-sidebar-nav-height)] items-center gap-3 rounded-lg px-3 text-[var(--jw-body-size)] font-semibold leading-none text-stone-950 transition-colors",
        item.largeScreenOnly ? "app-shell-navigation-link--large-only" : null,
        isActive
          ? "border-l-4 border-[#007780] bg-stone-950/6 pl-2 text-[#075d63] xl:pl-3"
          : "hover:bg-stone-950/5",
      )}
      to={item.href}
    >
      <Icon
        aria-hidden="true"
        className="h-[var(--jw-icon-md)] w-[var(--jw-icon-md)] shrink-0"
        strokeWidth={1.8}
      />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}
