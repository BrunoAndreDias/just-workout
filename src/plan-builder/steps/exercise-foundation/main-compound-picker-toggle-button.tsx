import { ListOrdered } from "lucide-react";
import { Button } from "../../../design-system/button";

export function MainCompoundPickerToggleButton({
  accessibleLabel,
  className,
  isOpen,
  label,
  onToggle,
  pickerId,
}: {
  accessibleLabel?: string;
  className?: string;
  isOpen: boolean;
  label: string;
  onToggle: () => void;
  pickerId: string;
}) {
  return (
    <Button
      aria-expanded={isOpen}
      aria-controls={isOpen ? pickerId : undefined}
      aria-label={accessibleLabel}
      className={className}
      onClick={onToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      <ListOrdered aria-hidden="true" size={16} strokeWidth={2} />
      {label}
    </Button>
  );
}
