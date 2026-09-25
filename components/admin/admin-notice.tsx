import { AlertCircle } from "lucide-react";

/** An expected failure surfaced after a redirect (?error=…), e.g. "it has bookings". */
export function AdminNotice({ message }: { message?: string | string[] }) {
  const text = Array.isArray(message) ? message[0] : message;
  if (!text) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}
