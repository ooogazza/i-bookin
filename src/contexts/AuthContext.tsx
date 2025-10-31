import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkUserRole } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check admin status only if online
        if (session?.user && navigator.onLine) {
          setTimeout(() => {
            checkUserRole(session.user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
          }, 0);
        } else if (session?.user) {
          // When offline, try to get cached admin status from localStorage
          const cachedAdmin = localStorage.getItem(`admin-${session.user.id}`);
          setIsAdmin(cachedAdmin === 'true');
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user && navigator.onLine) {
        checkUserRole(session.user.id).then((isAdmin) => {
          setIsAdmin(isAdmin);
          // Cache admin status
          localStorage.setItem(`admin-${session.user.id}`, String(isAdmin));
        }).catch(() => setIsAdmin(false));
      } else if (session?.user) {
        // When offline, use cached admin status
        const cachedAdmin = localStorage.getItem(`admin-${session.user.id}`);
        setIsAdmin(cachedAdmin === 'true');
      }
      
      setLoading(false);
    }).catch(() => {
      // If getSession fails (offline), try to load from cache
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
