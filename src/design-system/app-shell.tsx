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

type AppShellProps = {
  children: ReactNode;
  currentPathname: string;
};

type AppShellNavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const appShellNavigationItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/workout", icon: Dumbbell, label: "Workouts" },
  { href: "/exercise-library", icon: BookOpen, label: "Exercise Library" },
  { href: "/plan-builder", icon: CalendarCheck, label: "Workout Plan Builder" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const satisfies ReadonlyArray<AppShellNavigationItem>;

export function AppShell({ children, currentPathname }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#162325]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-stone-950/8 bg-[#fbf8f3]/92 px-4 py-5 lg:min-h-screen lg:border-r lg:px-8 lg:py-8">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#00636a] text-white">
              <Dumbbell aria-hidden="true" size={21} strokeWidth={2.4} />
            </span>
            <span className="truncate text-[1.2rem] font-black leading-none text-[#075d63]">
              Just Workout
            </span>
          </Link>

          <nav className="mt-6 grid gap-1 lg:mt-16" aria-label="Primary">
            {appShellNavigationItems.map((item) => (
              <AppShellNavigationLink
                currentPathname={currentPathname}
                item={item}
                key={item.href}
              />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-0 lg:py-0 lg:pr-5">{children}</main>
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
      ? currentPathname.startsWith("/plan-builder")
      : currentPathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex min-h-16 items-center gap-5 rounded-lg px-4 text-base font-medium text-stone-950 transition-colors",
        isActive
          ? "border-l-4 border-[#007780] bg-stone-950/6 pl-3 text-[#075d63]"
          : "hover:bg-stone-950/5",
      )}
      to={item.href}
    >
      <Icon aria-hidden="true" className="shrink-0" size={25} strokeWidth={1.8} />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}
