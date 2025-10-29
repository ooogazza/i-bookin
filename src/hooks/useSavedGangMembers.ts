import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedGangMember {
  id: string;
  name: string;
  type: string;
  email?: string;
}

export function useSavedGangMembers() {
  const { user } = useAuth();
  const [savedMembers, setSavedMembers] = useState<SavedGangMember[]>([]);

  useEffect(() => {
    if (user) {
      fetchSavedMembers();
    }
  }, [user]);

  const fetchSavedMembers = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_gang_members")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    
    if (!error && data) {
      setSavedMembers(data);
    }
  };

  return { savedMembers, setSavedMembers, fetchSavedMembers };
}
