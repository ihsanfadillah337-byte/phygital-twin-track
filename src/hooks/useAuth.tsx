import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  agencyName: string | null;
  role: "super_admin" | "skpd_user" | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, agencyName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"super_admin" | "skpd_user" | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);

  const fetchProfile = async (userId: string, metadata?: Record<string, any>) => {
    // Try role from user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole((roleData?.role as "super_admin" | "skpd_user") ?? "skpd_user");

    // Agency name: try user_metadata first, fallback to profiles table
    const metaAgency = metadata?.agency_name;
    if (metaAgency) {
      setAgencyName(metaAgency);
    } else {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("agency_name")
        .eq("id", userId)
        .maybeSingle();
      setAgencyName(profileData?.agency_name ?? null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => fetchProfile(session.user.id, session.user.user_metadata), 0);
        } else {
          setRole(null);
          setAgencyName(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, agency: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { agency_name: agency } },
    });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (userId) {
      // Insert into profiles table
      await supabase.from("profiles").upsert(
        { id: userId, agency_name: agency, role: "skpd_user" },
        { onConflict: "id" }
      );
      // Insert into user_roles table
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "skpd_user",
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, agencyName, role, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
