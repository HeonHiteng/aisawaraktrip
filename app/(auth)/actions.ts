"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_MODE } from "@/lib/demo/mode";
import {
  clearDemoUser,
  setDemoUser,
  type DemoPersona,
} from "@/lib/demo/session";
import { site } from "@/lib/site";
import { safeNextPath } from "@/lib/nav";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  loginSchema,
  registerSchema,
  upgradeSchema,
} from "@/lib/validation/auth";

const NOT_CONFIGURED = {
  error: "Auth is not set up yet — add your Supabase keys to .env.local.",
};

export type AuthState = {
  error?: string;
  message?: string;
};

/** Per-IP throttle for the auth surface. */
async function authThrottle(): Promise<AuthState | null> {
  const { ok, retryAfter } = await rateLimit(
    `auth:${await clientIp()}`,
    12,
    5 * 60_000,
  );
  return ok
    ? null
    : { error: `Too many attempts. Try again in ${retryAfter}s.` };
}

async function enterDemo(
  persona: DemoPersona,
  next?: string | null,
): Promise<never> {
  await setDemoUser(persona);
  revalidatePath("/", "layout");
  redirect(persona === "admin" ? "/admin" : safeNextPath(next));
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const next = formData.get("next") as string | null;
  if (DEMO_MODE) return enterDemo("tourist", next);
  const throttled = await authThrottle();
  if (throttled) return throttled;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email or password is incorrect." };

  revalidatePath("/", "layout");
  redirect(safeNextPath(next));
}

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const next = formData.get("next") as string | null;
  if (DEMO_MODE) return enterDemo("tourist", next);
  const throttled = await authThrottle();
  if (throttled) return throttled;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const dest = safeNextPath(next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${site.url}/auth/callback?next=${encodeURIComponent(dest)}`,
    },
  });
  if (error) return { error: error.message };

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(dest);
  }
  return { message: "Check your email to confirm your account, then sign in." };
}

export async function continueAsGuest(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const next = formData.get("next") as string | null;
  if (DEMO_MODE) return enterDemo("guest", next);
  const throttled = await authThrottle();
  if (throttled) return throttled;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously({
    options: { data: { full_name: "Guest" } },
  });
  if (error) {
    return {
      error:
        "Guest access isn't available. Enable Anonymous sign-ins in Supabase, or create an account.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(next));
}

/** Demo-only: jump between the guest / traveller / admin views. */
export async function switchDemoPersona(formData: FormData): Promise<void> {
  if (!DEMO_MODE) return;
  const persona = formData.get("persona") as DemoPersona;
  if (persona === "guest" || persona === "tourist" || persona === "admin") {
    await enterDemo(persona);
  }
}

export async function upgradeGuestAccount(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (DEMO_MODE) {
    await setDemoUser("tourist");
    revalidatePath("/", "layout");
    return { message: "Demo: you're now a registered traveller." };
  }
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = upgradeSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out." };
  if (!user.is_anonymous) return { error: "This account is already registered." };

  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
    password: parsed.data.password,
    data: { full_name: parsed.data.fullName },
  });
  if (error) return { error: error.message };

  await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return {
    message:
      "Account created. If email confirmation is on, check your inbox to verify.",
  };
}

export async function signOut(): Promise<void> {
  if (DEMO_MODE) {
    await clearDemoUser();
    revalidatePath("/", "layout");
    redirect("/");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
