import type * as React from "react";
import { cn } from "./cn";
import "./rail-panel.css";

export function RailPanel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <aside className={cn("rail-panel", className)} {...props} />;
}

export function RailPanelSection({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("rail-panel__section", className)} {...props} />;
}
