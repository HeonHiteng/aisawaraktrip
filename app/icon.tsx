import { ImageResponse } from "next/og";

// Route segment config
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// App icon (used by the browser tab and the PWA manifest).
// Placeholder mark — replace with real brand artwork in the design phase.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
          color: "#ffffff",
          fontSize: 300,
          fontWeight: 700,
          letterSpacing: -10,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
