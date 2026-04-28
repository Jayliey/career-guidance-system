import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Navigate } from "react-router-dom";

interface AdminCheckProps {
  children: React.ReactNode;
}

export default function AdminCheck({ children }: AdminCheckProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        setIsAdmin(false);
        return;
      }

      const user = data.user;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile fetch error:", profileError?.message);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(profile.is_admin === true);
    };

    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return <div className="loading">Checking permissions...</div>;
  }

  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}