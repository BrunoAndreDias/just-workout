import { Button } from "../../../design-system/button";

export function MainCompoundPickerToggleButton({
  isOpen,
  label,
  onToggle,
  pickerId,
}: {
  isOpen: boolean;
  label: string;
  onToggle: () => void;
  pickerId: string;
}) {
  return (
    <Button
      aria-expanded={isOpen}
      aria-controls={isOpen ? pickerId : undefined}
      onClick={onToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  );
}
