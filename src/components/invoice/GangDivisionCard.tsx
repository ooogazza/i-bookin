import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, X, Trash2, UserPlus, Users } from "lucide-react";
import { StickySplitButton } from "@/components/StickySplitButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface GangMember {
  id?: string;
  name: string;
  type: string;
  amount: number;
  email?: string;
  editing?: boolean;
}

export interface SavedGangMember {
  id: string;
  name: string;
  type: string;
}

export interface GangDivisionCardProps {
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
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gang Division</CardTitle>
          <div className="flex gap-2">
            {savedMembers && savedMembers.length > 0 && onAddExistingMember && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Users className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {savedMembers.map((member) => {
                    const alreadyAdded = gangMembers.some((m) => m.id === member.id);
                    return (
                      <DropdownMenuItem
                        key={member.id}
                        onClick={() => onAddExistingMember(member)}
                        disabled={alreadyAdded}
                        className="cursor-pointer"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{member.type}</span>
                        </div>
                        {alreadyAdded && (
                          <span className="ml-auto text-xs text-muted-foreground">Added</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button size="sm" onClick={onAddMemberClick}>
              <Plus className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Add Member</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {gangMembers.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No gang members added yet
          </p>
        )}

        {gangMembers.length > 0 && (
          <div className="space-y-3">
            {gangMembers.map((m, i) => {
              const safeAmount =
                typeof m.amount === "number" && !isNaN(m.amount) ? m.amount : 0;

              return (
                <div key={i} className="p-4 bg-primary/10 rounded-2xl space-y-2 border border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold text-base">{m.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{m.type}</p>
                      {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
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
                        Amount: £{safeAmount.toFixed(2)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Amount:</span>
                        <Input
                          autoFocus
                          type="number"
                          value={safeAmount}
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

                    {Number.isFinite(safeAmount) && (
                      <Slider
                        value={[safeAmount]}
                        onValueChange={(v) => {
                          const newAmount = v[0];
                          const otherMembersTotal = gangMembers
                            .filter((_, idx) => idx !== i)
                            .reduce((sum, member) => sum + (member.amount || 0), 0);
                          const maxAllowed = totalValue - otherMembersTotal;
                          const cappedAmount = Math.min(newAmount, Math.max(0, maxAllowed));
                          onUpdateMemberAmount(i, cappedAmount);
                        }}
                        onDragStart={() => setActiveSplitIndex(i)}
                        onDragEnd={() => setTimeout(() => setActiveSplitIndex(null), 6000)}
                        max={totalValue}
                        step={1}
                        className="w-full"
                      />
                    )}
                  </div>

                  {activeSplitIndex === i && i < gangMembers.length - 1 && (
                    <StickySplitButton
                      index={i}
                      label="Split"
                      onSplit={(index) => {
                        const memberA = gangMembers[index];
                        const memberB = gangMembers[index + 1];
                        const totalAvailable =
                          memberA.amount + memberB.amount + remainingToAllocate;
                        const splitAmount = Math.floor(totalAvailable / 2);

                        onUpdateMemberAmount(index, splitAmount);
                        onUpdateMemberAmount(index + 1, splitAmount);
                        setActiveSplitIndex(null);
                      }}
                    />
                  )}
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