import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon for iOS. Placeholder mark — swap for real artwork later.
export default function AppleIcon() {
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
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
