import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

type KeyValueRowProps = {
  className?: string;
  icon?: LucideIcon;
  label: string;
  status?: string | null;
  statusClassName?: string;
  value: string;
};

export function KeyValueRow({
  className,
  icon: Icon,
  label,
  status = null,
  statusClassName,
  value,
}: KeyValueRowProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 border-stone-950/8 py-[1.0625rem]",
        className,
      )}
    >
      <dt className="contents">
        <span className="flex h-7 w-7 items-center justify-center text-stone-950">
          {Icon ? <Icon aria-hidden="true" size={22} strokeWidth={1.7} /> : null}
        </span>
        <span className="min-w-0 text-base font-medium text-stone-950">{label}</span>
      </dt>
      <dd className="min-w-0 text-right text-base font-medium text-stone-950">
        {status ? (
          <span
            className={cn(
              "inline-flex min-h-11 items-center rounded-md px-4 text-sm text-[#5c6d73]",
              statusClassName,
            )}
          >
            {status}
          </span>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </dd>
    </div>
  );
}
