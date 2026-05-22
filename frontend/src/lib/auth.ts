// src/lib/auth.ts
import { supabase } from "./supabaseClient";

export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      console.error("Auth error:", userError);
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return false;
    }

    return data?.role === "admin";
  } catch (error) {
    console.error("Admin check failed:", error);
    return false;
  }
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getCurrentUserProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const updateUserRole = async (userId: string, role: "user" | "admin") => {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  
  if (error) throw error;
  return true;
};