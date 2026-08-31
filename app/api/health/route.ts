import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness probe. Used by uptime checks and deploy smoke tests.
 * Does not touch the database or any external service.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sarawak-trip-planner",
    time: new Date().toISOString(),
  });
}
