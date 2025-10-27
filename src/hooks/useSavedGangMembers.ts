import { useState } from "react";

export interface SavedGangMember {
  id: string;
  name: string;
  type: string;
}

export function useSavedGangMembers() {
  const [savedMembers] = useState<SavedGangMember[]>([
    { id: "1", name: "John Smith", type: "labourer" },
    { id: "2", name: "Sarah Jones", type: "bricklayer" },
    { id: "3", name: "Ali Khan", type: "plumber" },
  ]);

  return savedMembers;
}
