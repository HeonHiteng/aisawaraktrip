import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getUser } from "@/lib/auth";
import { login } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/home");
  return <AuthForm mode="login" action={login} />;
}
