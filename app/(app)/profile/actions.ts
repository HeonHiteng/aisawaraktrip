"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DELETE_CONFIRM_WORD } from "@/lib/account-deletion";
import { deleteAccount } from "@/lib/domain/account";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/mode";
import { clearDemoUser } from "@/lib/demo/session";
import { rateLimit } from "@/lib/rate-limit";
import { profileSchema } from "@/lib/validation/auth";

export type ProfileState = { error?: string; message?: string };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    country: formData.get("country"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  if (DEMO_MODE) {
    return { message: "Demo mode — changes aren't saved." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
    })
    .eq("id", user.id);

  if (error) return { error: "Could not save your profile." };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { message: "Profile saved." };
}

export type DeleteAccountState = { error?: string };

/**
 * Permanently delete the account. Needs the typed word DELETE so it can't be a stray tap.
 * On success the session is ended and the person lands on the sign-in screen.
 */
export async function deleteMyAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim() !== DELETE_CONFIRM_WORD) {
    return { error: `Type ${DELETE_CONFIRM_WORD} to confirm.` };
  }
  const rl = await rateLimit(`delete-account:${user.id}`, 5, 10 * 60_000);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfter}s.` };

  const result = await deleteAccount(user.id);
  if ("error" in result) return { error: result.error };

  if (DEMO_MODE) await clearDemoUser();
  else await (await createClient()).auth.signOut(); // clears the cookies; the user no longer exists
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
