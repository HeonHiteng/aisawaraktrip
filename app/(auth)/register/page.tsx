import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/nav";
import { register } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : null;
  const next = safeNextPath(raw, "/home");
  if (await getUser()) redirect(next);
  return (
    <AuthForm
      mode="register"
      action={register}
      next={raw ? next : undefined}
    />
  );
}
