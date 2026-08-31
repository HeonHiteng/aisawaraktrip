"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
            The app hit an unexpected error. Please reload.
          </p>
          {error.digest && (
            <p style={{ color: "#999", fontSize: 12, marginTop: 8 }}>
              ref {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#6d28d9",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
