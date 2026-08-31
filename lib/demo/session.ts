import "server-only";
import { cookies } from "next/headers";

const COOKIE = "demo_session";

export type DemoPersona = "guest" | "tourist" | "admin";

export interface DemoUser {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  persona: DemoPersona;
}

const USERS: Record<DemoPersona, DemoUser> = {
  guest: {
    id: "demo-guest",
    email: null,
    is_anonymous: true,
    persona: "guest",
  },
  tourist: {
    id: "demo-tourist",
    email: "demo@sarawaktrips.test",
    is_anonymous: false,
    persona: "tourist",
  },
  admin: {
    id: "demo-admin",
    email: "admin@sarawaktrips.test",
    is_anonymous: false,
    persona: "admin",
  },
};

export async function getDemoUser(): Promise<DemoUser | null> {
  const store = await cookies();
  const persona = store.get(COOKIE)?.value as DemoPersona | undefined;
  return persona && persona in USERS ? USERS[persona] : null;
}

export async function setDemoUser(persona: DemoPersona): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, persona, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearDemoUser(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
