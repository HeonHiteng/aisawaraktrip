import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getUser } from "@/lib/auth";
import { register } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/plan");
  return <AuthForm mode="register" action={register} />;
}
