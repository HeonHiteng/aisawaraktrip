"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // TODO(phase-9): report to Sentry when NEXT_PUBLIC_SENTRY_DSN is set
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. You can try again — if it keeps happening,
        head back home.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          ref {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
        >
          Go home
        </Button>
      </div>
    </div>
  );
}
