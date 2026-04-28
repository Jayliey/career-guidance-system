import { supabase } from "./supabaseClient";

export const isAdmin = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) return false;

  return data.role === "admin";
};