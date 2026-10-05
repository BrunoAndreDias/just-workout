import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../design-system/cn";
import "./choice-card.css";

export type ChoiceCardFact = {
  label: string;
  value: string;
};

export function ChoiceCardGroup({
  children,
  className,
  columns = 3,
  legend,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3;
  legend: string;
}) {
  return (
    <fieldset className={cn("pb-choice-group", className)} data-columns={columns}>
      <legend className="sr-only">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function ChoiceCard({
  className,
  description,
  facts,
  highlights,
  isRecommended = false,
  isSelected,
  name,
  onClick,
  onSelect,
  title,
  value,
}: {
  className?: string;
  description?: string;
  facts?: ReadonlyArray<ChoiceCardFact>;
  highlights?: ReadonlyArray<string>;
  isRecommended?: boolean;
  isSelected: boolean;
  name: string;
  onClick?: () => void;
  onSelect: () => void;
  title: string;
  value: string;
}) {
  return (
    <label
      className={cn("pb-choice-card", className)}
      data-recommended={isRecommended ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name={name}
        onChange={onSelect}
        onClick={onClick}
        type="radio"
        value={value}
      />
      <span className="pb-choice-card__head">
        <span aria-hidden="true" className="pb-choice-card__radio">
          {isSelected ? <Check size={13} strokeWidth={3.2} /> : null}
        </span>
        <span className="pb-choice-card__title">{title}</span>
        {isRecommended ? <span className="pb-choice-card__badge">Recommended</span> : null}
      </span>
      {description ? <span className="pb-choice-card__description">{description}</span> : null}
      {facts && facts.length > 0 ? (
        <dl className="pb-choice-card__facts">
          {facts.map((fact) => (
            <div className="pb-choice-card__fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {highlights && highlights.length > 0 ? (
        <ul className="pb-choice-card__highlights">
          {highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
