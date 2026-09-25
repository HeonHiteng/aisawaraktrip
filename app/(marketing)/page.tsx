import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

/**
 * This is an app, not a website: "/" has no page of its own. Signed in → your
 * home; otherwise → sign in (which also offers "Continue as guest").
 */
export default async function RootPage() {
  redirect((await getUser()) ? "/home" : "/login");
}
