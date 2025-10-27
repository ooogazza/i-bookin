import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SavedGangMember {
  id: string;
  name: string;
  type: string;
}

interface GangMember {
  id?: string;
  name: string;
  type: string;
  amount: number;
  editing?: boolean;
}

interface GangDivisionCardProps {
  gangMembers: GangMember[];
  totalValue: number;
  totalAllocated: number;
  remainingToAllocate: number;
  onAddMemberClick: () => void;
  onRemoveMember: (index: number) => void;
  onDeletePermanently?: (memberId: string, index: number) => void;
  onUpdateMemberAmount: (index: number, newAmount: number) => void;
  onStartEditing: (index: number) => void;
  onStopEditing: (index: number) => void;
  savedMembers?: SavedGangMember[];
  onAddExistingMember?: (member: SavedGangMember) => void;
  totalValueLabel?: string;
}

export const GangDivisionCard = ({
  gangMembers,
  totalValue,
  totalAllocated,
  remainingToAllocate,
  onAddMemberClick,
  onRemoveMember,
  onDeletePermanently,
  onUpdateMemberAmount,
  onStartEditing,
  onStopEditing,
  savedMembers,
  onAddExistingMember,
  totalValueLabel = "Total",
}: GangDivisionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gang Division</CardTitle>
          <Button size="sm" onClick={onAddMemberClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {savedMembers && savedMembers.length > 0 && onAddExistingMember && (
          <div className="mb-4">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Quick Add from Saved Members:
            </Label>
            <div className="flex flex-wrap gap-2">
              {savedMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onAddExistingMember(member)}
                  disabled={gangMembers.some(m => m.id === member.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {member.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {gangMembers.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No gang members added yet
          </p>
        )}

        {gangMembers.length > 0 && (
          <div className="space-y-3">
            {gangMembers.map((m, i) => {
              return (
                <div key={i} className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold text-base">{m.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{m.type}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMember(i)}
                        title="Remove from this invoice"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      {m.id && onDeletePermanently && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePermanently(m.id!, i)}
                          className="text-destructive hover:text-destructive"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {!m.editing ? (
                      <span
                        className="cursor-pointer hover:text-primary font-medium text-sm block"
                        onClick={() => onStartEditing(i)}
                      >
                        Amount: £{m.amount.toFixed(2)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Amount:</span>
                        <Input
                          autoFocus
                          type="number"
                          value={m.amount}
                          onBlur={() => onStopEditing(i)}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            onUpdateMemberAmount(i, v);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && onStopEditing(i)}
                          className="w-24 h-8"
                          step={1}
                          min={0}
                        />
                      </div>
                    )}

                    <Slider
                      value={[m.amount]}
                      onValueChange={(v) => {
                        const newAmount = v[0];
                        onUpdateMemberAmount(i, newAmount);
                      }}
                      max={totalValue}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              );
            })}

            <div className="mt-4 pt-4 border-t space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{totalValueLabel}:</span>
                <span className="font-semibold">£{totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Allocated:</span>
                <span className="font-semibold">£{totalAllocated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span
                  className={`font-semibold ${
                    remainingToAllocate < 0
                      ? "text-destructive"
                      : remainingToAllocate > 0
                      ? "text-orange-500"
                      : "text-green-600"
                  }`}
                >
                  £{remainingToAllocate.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};