import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/nav";
import { login } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : null;
  const next = safeNextPath(raw, "/home");
  if (await getUser()) redirect(next);
  return (
    <>
      {sp.deleted === "1" && (
        <p role="status" className="mb-4 rounded-xl border border-border bg-muted px-4 py-3 text-center text-sm">
          Your account and data have been deleted.
        </p>
      )}
      <AuthForm
        mode="login"
        action={login}
        next={raw ? next : undefined}
      />
    </>
  );
}
