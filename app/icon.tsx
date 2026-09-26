import { ImageResponse } from "next/og";
import mark from "@/brand/mark.json";

// Route segment config
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// App icon (browser tab + PWA manifest): the brand mark from brand/mark.json.
export default function Icon() {
  const [c1, c2] = mark.gradient;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${mark.bounds.x + mark.bounds.w / 2 - 256} ${mark.bounds.y + mark.bounds.h / 2 - 256} 512 512`}
        >
          <path d={mark.pin} fill="#ffffff" fillRule="evenodd" />
          <path d={mark.spark} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
