import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function AdminCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        console.log("AdminCheck: No user found");
        setIsAdmin(false);
        return;
      }
      console.log("AdminCheck: user.id =", user.id);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("AdminCheck error:", error);
        setIsAdmin(false);
        return;
      }
      console.log("AdminCheck: profile =", profile);
      setIsAdmin(profile?.is_admin === true);
    };
    checkAdmin();
  }, [user]);

  if (isAdmin === null) return <div className="loading">Checking permissions...</div>;
  console.log("AdminCheck: isAdmin =", isAdmin);
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}