"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout } = useAuthStore();

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .single();
        const role = profile?.role ?? "consumer";
        const name =
          profile?.full_name ??
          (session.user.user_metadata?.full_name as string) ??
          session.user.email?.split("@")[0] ??
          "User";
        login(
          {
            id: session.user.id,
            name,
            email: session.user.email ?? "",
            role,
          },
          session.access_token
        );
      } else {
        logout();
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .single();
        const role = profile?.role ?? "consumer";
        const name =
          profile?.full_name ??
          (session.user.user_metadata?.full_name as string) ??
          session.user.email?.split("@")[0] ??
          "User";
        login(
          {
            id: session.user.id,
            name,
            email: session.user.email ?? "",
            role,
          },
          session.access_token
        );
      } else {
        logout();
      }
    });

    return () => subscription.unsubscribe();
  }, [login, logout]);

  return <>{children}</>;
}
