import { Link } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Dumbbell, History, Play } from "lucide-react";
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

const appShellNavigationLinkClassName =
  "app-shell-navigation-link group flex items-center justify-center text-sm font-medium leading-none text-stone-950 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#007780]/55";

const appShellNavigationPillClassName =
  "app-shell-navigation-pill inline-flex items-center rounded-full px-3 py-1.5 transition-colors duration-200";

export function AppShell({ children, currentPathname, trainingSessionTarget }: AppShellProps) {
  const trainingHistoryPath = trainingSessionTarget
    ? `/training-plans/${trainingSessionTarget.planId}/sessions`
    : null;
  const startTrainingPath = trainingSessionTarget
    ? `/training-plans/${trainingSessionTarget.planId}/sessions/new/${trainingSessionTarget.templateId}`
    : null;

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
                    aria-current={currentPathname === trainingHistoryPath ? "page" : undefined}
                    activeOptions={{ exact: true }}
                    className={appShellNavigationLinkClassName}
                    params={{ planId: trainingSessionTarget.planId }}
                    to="/training-plans/$planId/sessions"
                  >
                    <AppShellNavigationPill
                      icon={
                        <History
                          aria-hidden="true"
                          className="app-shell-navigation-icon"
                          strokeWidth={1.8}
                        />
                      }
                      isActive={currentPathname === trainingHistoryPath}
                      label="Training history"
                    />
                  </Link>
                  <Link
                    aria-label="Start training"
                    aria-current={currentPathname === startTrainingPath ? "page" : undefined}
                    activeOptions={{ exact: true }}
                    className={appShellNavigationLinkClassName}
                    params={{
                      planId: trainingSessionTarget.planId,
                      templateId: trainingSessionTarget.templateId,
                    }}
                    to="/training-plans/$planId/sessions/new/$templateId"
                  >
                    <AppShellNavigationPill
                      icon={
                        <Play
                          aria-hidden="true"
                          className="app-shell-navigation-icon"
                          fill="currentColor"
                          strokeWidth={1.8}
                        />
                      }
                      isActive={currentPathname === startTrainingPath}
                      label="Start training"
                    />
                  </Link>
                </nav>
              ) : null}
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
  const isActive = isAppShellNavigationItemActive(currentPathname, item.href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={appShellNavigationLinkClassName}
      activeOptions={item.href === "/training-plans" ? { exact: true } : undefined}
      to={item.href}
    >
      <AppShellNavigationPill icon={item.icon} isActive={isActive} label={item.label} />
    </Link>
  );
}

function isAppShellNavigationItemActive(currentPathname: string, href: string) {
  if (href === "/plan-builder") {
    return currentPathname.startsWith(href);
  }

  if (href === "/training-plans") {
    return currentPathname === href || /^\/training-plans\/[^/]+$/.test(currentPathname);
  }

  return currentPathname === href;
}

function AppShellNavigationPill({
  icon,
  isActive,
  label,
}: {
  icon: ReactNode;
  isActive: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        appShellNavigationPillClassName,
        isActive ? "bg-stone-950/8 text-[#075d63]" : "group-hover:bg-stone-950/6",
      )}
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
