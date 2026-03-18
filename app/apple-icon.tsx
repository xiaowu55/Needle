import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

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
          background: "linear-gradient(145deg, #f4f1ea 0%, #e7dfd1 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 136,
            height: 136,
            borderRadius: 32,
            background: "#111111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 78,
              height: 78,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at center, #f4f1ea 0 18%, #111111 18% 22%, #2b2b2b 22% 46%, #111111 46% 100%)",
              transform: "translateX(18px)",
            }}
          />
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 18,
              background: "#f8f4ec",
              border: "4px solid #111111",
              transform: "translateX(-14px)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              padding: "0 0 9px 9px",
            }}
          >
            <div
              style={{
                width: 38,
                height: 6,
                background: "#d05a36",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
