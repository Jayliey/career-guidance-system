import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isAdmin } from "../lib/auth";

interface AdminCheckProps {
  children: React.ReactNode;
}

export default function AdminCheck({ children }: AdminCheckProps) {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const result = await isAdmin();
        setAdmin(result);
      } catch (error) {
        console.error("Admin check error:", error);
        setAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  if (loading) {
    return <div className="loading">Checking admin permissions...</div>;
  }

  return admin ? <>{children}</> : <Navigate to="/" replace />;
}