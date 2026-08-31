import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_MODE } from "@/lib/demo/mode";
import { getDemoUser } from "@/lib/demo/session";

export type Role = "tourist" | "admin";

export interface AppUser {
  id: string;
  email: string | null;
  isAnonymous: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  role: Role;
}

/** The authenticated user (real or demo), or null. */
export async function getUser(): Promise<AppUser | null> {
  if (DEMO_MODE) {
    const u = await getDemoUser();
    return u ? { id: u.id, email: u.email, isAnonymous: u.is_anonymous } : null;
  }
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user
    ? {
        id: user.id,
        email: user.email ?? null,
        isAnonymous: user.is_anonymous ?? false,
      }
    : null;
}

/** The current user's profile, or null if signed out. */
export async function getProfile(): Promise<Profile | null> {
  if (DEMO_MODE) {
    const u = await getDemoUser();
    if (!u) return null;
    return {
      id: u.id,
      full_name: u.persona === "guest" ? "Guest" : "Demo Traveller",
      avatar_url: null,
      phone: null,
      country: null,
      role: u.persona === "admin" ? "admin" : "tourist",
    };
  }
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone, country, role")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Redirect to /login unless signed in. Returns the user. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirect unless signed in AND an admin. Returns the profile. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");
  return profile;
}
