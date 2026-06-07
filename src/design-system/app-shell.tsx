import { Link } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Dumbbell } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import "./app-shell.css";

type AppShellProps = {
  children: ReactNode;
  currentPathname: string;
};

type AppShellNavigationItem = {
  href: string;
  icon: ReactNode;
  label: string;
};

const appShellNavigationItems = [
  {
    href: "/plan-builder",
    icon: (
      <CalendarCheck aria-hidden="true" className="app-shell-navigation-icon" strokeWidth={1.7} />
    ),
    label: "Plan Builder",
  },
  {
    href: "/training-plans",
    icon: (
      <ClipboardList aria-hidden="true" className="app-shell-navigation-icon" strokeWidth={1.7} />
    ),
    label: "Training Plans",
  },
] as const satisfies ReadonlyArray<AppShellNavigationItem>;

export function AppShell({ children, currentPathname }: AppShellProps) {
  return (
    <div className="app-shell min-h-screen text-[#162325]">
      <div className="app-shell-frame mx-auto min-h-screen w-full max-w-[1200px] px-2 sm:px-2">
        <div className="app-shell-surface min-h-screen border-x border-stone-950/12">
          <header className="app-shell-topbar sticky top-0 z-40 flex items-stretch justify-between border-b border-stone-950/10 backdrop-blur-md">
            <div className="flex min-w-0 items-stretch">
              <Link
                aria-label="Just Workout"
                className="app-shell-brand flex min-w-0 items-center gap-2 px-4 pr-3 transition-colors hover:bg-stone-950/5 sm:px-5"
                to="/plan-builder"
              >
                <span className="app-shell-brand-mark flex shrink-0 items-center justify-center bg-[#00636a] text-white">
                  <Dumbbell aria-hidden="true" className="app-shell-brand-icon" strokeWidth={2.4} />
                </span>
                <span className="app-shell-brand-name jw-heading-font truncate font-bold leading-none tracking-[var(--jw-heading-tracking)] text-[#075d63]">
                  Just Workout
                </span>
              </Link>

              <nav className="app-shell-navigation flex items-stretch" aria-label="Primary">
                {appShellNavigationItems.map((item) => (
                  <AppShellNavigationLink
                    currentPathname={currentPathname}
                    item={item}
                    key={item.href}
                  />
                ))}
              </nav>
            </div>
          </header>

          <main className="app-shell-main min-w-0">{children}</main>
        </div>
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
  const isActive = currentPathname.startsWith(item.href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "app-shell-navigation-link group flex items-center justify-center px-2 text-sm font-medium leading-none text-stone-950 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#007780]/55",
      )}
      to={item.href}
    >
      <span
        className={cn(
          "app-shell-navigation-pill inline-flex items-center rounded-full px-3 py-1.5 transition-colors duration-200",
          isActive ? "bg-stone-950/8 text-[#075d63]" : "group-hover:bg-stone-950/6",
        )}
      >
        {item.icon}
        <span className="min-w-0 truncate">{item.label}</span>
      </span>
    </Link>
  );
}
