import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  History,
  Play,
  UserCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import "./app-shell.css";

type AppShellProps = {
  children: ReactNode;
  currentPathname: string;
  trainingSessionTarget: AppShellTrainingSessionTarget | null;
};

type AppShellTrainingSessionTarget = {
  planId: string;
  templateId: string;
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

export function AppShell({ children, currentPathname, trainingSessionTarget }: AppShellProps) {
  return (
    <div className="app-shell min-h-screen text-[#162325]">
      <div className="app-shell-frame mx-auto w-full max-w-[1200px]">
        <div className="app-shell-surface border border-stone-950/10">
          <header className="app-shell-topbar sticky top-0 z-40 flex items-stretch justify-between border-b border-stone-950/10 backdrop-blur-md">
            <div className="flex min-w-0 items-stretch">
              <Link
                aria-label="Just Workout"
                className="app-shell-brand flex min-w-0 items-center gap-3 px-4 pr-3 transition-colors hover:bg-stone-950/5 sm:px-5"
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

              {trainingSessionTarget ? (
                <nav className="app-shell-session-navigation" aria-label="Training Session">
                  <Link
                    aria-label="Training history"
                    className="app-shell-session-link"
                    params={{ planId: trainingSessionTarget.planId }}
                    to="/training-plans/$planId/sessions"
                  >
                    <History
                      aria-hidden="true"
                      className="app-shell-session-link__icon"
                      strokeWidth={1.8}
                    />
                    <span>Training history</span>
                  </Link>
                  <Link
                    aria-label="Start training"
                    className="app-shell-session-link app-shell-session-link--primary"
                    params={{
                      planId: trainingSessionTarget.planId,
                      templateId: trainingSessionTarget.templateId,
                    }}
                    to="/training-plans/$planId/sessions/new/$templateId"
                  >
                    <Play
                      aria-hidden="true"
                      className="app-shell-session-link__icon"
                      fill="currentColor"
                      strokeWidth={1.8}
                    />
                    <span>Start training</span>
                  </Link>
                </nav>
              ) : null}
            </div>

            <div className="app-shell-actions flex shrink-0 items-center">
              <button className="app-shell-icon-button" type="button" aria-label="Notifications">
                <Bell aria-hidden="true" className="app-shell-action-icon" strokeWidth={1.8} />
              </button>
              <button className="app-shell-profile-button" type="button" aria-label="Profile">
                <UserCircle
                  aria-hidden="true"
                  className="app-shell-profile-icon"
                  strokeWidth={1.9}
                />
              </button>
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
        "app-shell-navigation-link group flex items-center justify-center text-sm font-medium leading-none text-stone-950 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#007780]/55",
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
