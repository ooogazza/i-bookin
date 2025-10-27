import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface StickySplitButtonProps {
  index: number; // index of the first member in the pair
  remainingAmount: number;
  onSplit: (index: number) => void;
}

export const StickySplitButton = ({
  index,
  remainingAmount,
  onSplit,
}: StickySplitButtonProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible || remainingAmount <= 0) return null;

  return (
    <div className="flex justify-center my-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onSplit(index)}
        className="animate-pulse"
      >
        Split £{remainingAmount.toFixed(2)} evenly
      </Button>
    </div>
  );
};
