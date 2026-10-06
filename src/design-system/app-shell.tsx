import { Link } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Dumbbell, History, Play } from "lucide-react";
import { createContext, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";
import {
  getTrainingSessionHistoryHref,
  getTrainingSessionStartChoiceHref,
  isTrainingPlansNavigationPathname,
  trainingPlanPaths,
} from "../training-plan/training-plan-paths";
import "./app-shell.css";

type AppShellProps = {
  children: ReactNode;
  currentPathname: string;
  trainingSessionTarget: AppShellTrainingSessionTarget | null;
};

type AppShellTrainingSessionTarget = {
  planId: string;
};

const planBuilderNavigationHref = "/plan-builder";
const trainingPlansNavigationHref = trainingPlanPaths.list;

type AppShellNavigationHref = typeof planBuilderNavigationHref | typeof trainingPlansNavigationHref;

type AppShellNavigationItem = {
  href: AppShellNavigationHref;
  icon: ReactNode;
  label: string;
  shortLabel: string;
};

/** Top-bar slot a page can fill with its own navigation, e.g. the Plan Builder steps. */
const AppShellTopbarSlotContext = createContext<HTMLElement | null>(null);

export function AppShellTopbarContent({ children }: { children: ReactNode }) {
  const slot = useContext(AppShellTopbarSlotContext);

  return slot ? createPortal(children, slot) : null;
}

const appShellNavigationItems = [
  {
    href: planBuilderNavigationHref,
    icon: (
      <CalendarCheck aria-hidden="true" className="app-shell-navigation-icon" strokeWidth={1.7} />
    ),
    label: "Plan Builder",
    shortLabel: "Builder",
  },
  {
    href: trainingPlansNavigationHref,
    icon: (
      <ClipboardList aria-hidden="true" className="app-shell-navigation-icon" strokeWidth={1.7} />
    ),
    label: "Training Plans",
    shortLabel: "Plans",
  },
] as const satisfies ReadonlyArray<AppShellNavigationItem>;

const appShellNavigationLinkClassName = "view-link app-shell-navigation-link";

export function AppShell({ children, currentPathname, trainingSessionTarget }: AppShellProps) {
  const trainingHistoryPath = trainingSessionTarget
    ? getTrainingSessionHistoryHref(trainingSessionTarget.planId)
    : null;
  const startTrainingPath = trainingSessionTarget
    ? getTrainingSessionStartChoiceHref(trainingSessionTarget.planId)
    : null;
  const isStartTrainingActive =
    startTrainingPath !== null &&
    (currentPathname === startTrainingPath || currentPathname.startsWith(`${startTrainingPath}/`));
  const [topbarSlot, setTopbarSlot] = useState<HTMLElement | null>(null);

  return (
    <AppShellTopbarSlotContext.Provider value={topbarSlot}>
      <div className="app-shell min-h-screen text-ink">
        <div className="app-shell-frame mx-auto w-full max-w-[1200px]">
          <div className="app-shell-surface border border-border">
            <header className="app-shell-topbar sticky top-0 z-40 flex items-stretch justify-between border-b border-border backdrop-blur-md">
              <div className="app-shell-topbar-row flex min-w-0 flex-1 items-stretch">
                <Link
                  aria-label="Just Workout"
                  className="app-shell-brand flex min-w-0 items-center gap-3 px-4 pr-3 transition-colors hover:bg-rule sm:px-5"
                  to={planBuilderNavigationHref}
                >
                  <span className="app-shell-brand-mark flex shrink-0 items-center justify-center bg-accent text-on-accent">
                    <Dumbbell
                      aria-hidden="true"
                      className="app-shell-brand-icon"
                      strokeWidth={2.4}
                    />
                  </span>
                  <span className="app-shell-brand-name jw-heading-font truncate font-bold leading-none tracking-[var(--jw-heading-tracking)] text-accent-dark">
                    Just Workout
                  </span>
                </Link>

                <div className="app-shell-topbar-slot" ref={setTopbarSlot} />

                <nav className="views app-shell-navigation" aria-label="Primary">
                  {appShellNavigationItems.map((item) => (
                    <AppShellNavigationLink
                      currentPathname={currentPathname}
                      item={item}
                      key={item.href}
                    />
                  ))}
                </nav>

                <nav className="views app-shell-session-navigation" aria-label="Training Session">
                  {trainingSessionTarget ? (
                    <>
                      <Link
                        aria-label="Training history"
                        aria-current={currentPathname === trainingHistoryPath ? "page" : undefined}
                        activeOptions={{ exact: true }}
                        className={appShellNavigationLinkClassName}
                        params={{ planId: trainingSessionTarget.planId }}
                        to={trainingPlanPaths.sessionHistory}
                      >
                        <History
                          aria-hidden="true"
                          className="app-shell-navigation-icon"
                          strokeWidth={1.8}
                        />
                        <AppShellNavigationLabel label="Training history" shortLabel="History" />
                      </Link>
                      <Link
                        aria-label="Start training"
                        aria-current={isStartTrainingActive ? "page" : undefined}
                        activeOptions={{ exact: true }}
                        className={appShellNavigationLinkClassName}
                        params={{
                          planId: trainingSessionTarget.planId,
                        }}
                        to={trainingPlanPaths.sessionStartChoice}
                      >
                        <Play
                          aria-hidden="true"
                          className="app-shell-navigation-icon"
                          fill="currentColor"
                          strokeWidth={1.8}
                        />
                        <AppShellNavigationLabel label="Start training" shortLabel="Start" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <AppShellNavigationDisabledPill
                        icon={
                          <History
                            aria-hidden="true"
                            className="app-shell-navigation-icon"
                            strokeWidth={1.8}
                          />
                        }
                        label="Training history"
                        shortLabel="History"
                      />
                      <AppShellNavigationDisabledPill
                        icon={
                          <Play
                            aria-hidden="true"
                            className="app-shell-navigation-icon"
                            fill="currentColor"
                            strokeWidth={1.8}
                          />
                        }
                        label="Start training"
                        shortLabel="Start"
                      />
                    </>
                  )}
                </nav>
              </div>
            </header>

            <main className="app-shell-main min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </AppShellTopbarSlotContext.Provider>
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
      aria-label={item.label}
      className={appShellNavigationLinkClassName}
      data-nav-item={item.href === planBuilderNavigationHref ? "plan-builder" : undefined}
      activeOptions={item.href === trainingPlansNavigationHref ? { exact: true } : undefined}
      to={item.href}
    >
      {item.icon}
      <AppShellNavigationLabel label={item.label} shortLabel={item.shortLabel} />
    </Link>
  );
}

function isAppShellNavigationItemActive(currentPathname: string, href: AppShellNavigationHref) {
  switch (href) {
    case planBuilderNavigationHref:
      return currentPathname.startsWith(planBuilderNavigationHref);
    case trainingPlansNavigationHref:
      return isTrainingPlansNavigationPathname(currentPathname);
  }
}

function AppShellNavigationLabel({ label, shortLabel }: { label: string; shortLabel: string }) {
  return (
    <>
      <span className="app-shell-navigation-label min-w-0 truncate">{label}</span>
      <span className="app-shell-navigation-label-short">{shortLabel}</span>
    </>
  );
}

function AppShellNavigationDisabledPill({
  icon,
  label,
  shortLabel,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
}) {
  return (
    <span
      aria-disabled="true"
      className={`${appShellNavigationLinkClassName} app-shell-navigation-link--disabled`}
    >
      {icon}
      <AppShellNavigationLabel label={label} shortLabel={shortLabel} />
    </span>
  );
}
