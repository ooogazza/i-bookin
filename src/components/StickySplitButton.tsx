import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface StickySplitButtonProps {
  index: number;
  label?: string;
  onSplit: (index: number) => void;
}

export const StickySplitButton = ({
  index,
  label = "Split",
  onSplit,
}: StickySplitButtonProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex justify-center my-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onSplit(index)}
        className="animate-pulse"
      >
        {label}
      </Button>
    </div>
  );
};