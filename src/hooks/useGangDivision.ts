import { useState } from "react";

export interface GangMember {
  id?: string;
  name: string;
  type: string;
  amount: number;
  email?: string;
  editing?: boolean;
}

export function useGangDivision(initialMembers: GangMember[], totalValue: number) {
  const [gangMembers, setGangMembers] = useState<GangMember[]>(initialMembers);

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = totalValue - totalAllocated;

  const updateMemberAmount = (index: number, newAmount: number) => {
    const updated = [...gangMembers];
    updated[index].amount = newAmount;
    setGangMembers(updated);
  };

  const addMember = (member: GangMember) => {
    setGangMembers([...gangMembers, member]);
  };

  const removeMember = (index: number) => {
    const updated = [...gangMembers];
    updated.splice(index, 1);
    setGangMembers(updated);
  };

  const startEditing = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = true;
    setGangMembers(updated);
  };

  const stopEditing = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = false;
    setGangMembers(updated);
  };

  return {
    gangMembers,
    totalAllocated,
    remainingToAllocate,
    updateMemberAmount,
    addMember,
    removeMember,
    startEditing,
    stopEditing,
    setGangMembers,
  };
}
