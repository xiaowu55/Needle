import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

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
          background: "linear-gradient(145deg, #f4f1ea 0%, #e7dfd1 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 396,
            height: 396,
            borderRadius: 88,
            background: "#111111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: "0 28px 80px rgba(17,17,17,0.18)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at center, #f4f1ea 0 16%, #111111 16% 20%, #2b2b2b 20% 45%, #151515 45% 60%, #2e2e2e 60% 72%, #111111 72% 100%)",
              transform: "translateX(52px)",
            }}
          />
          <div
            style={{
              width: 244,
              height: 244,
              borderRadius: 42,
              background: "#f8f4ec",
              border: "10px solid #111111",
              position: "relative",
              transform: "translateX(-34px)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              padding: "0 0 22px 22px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,0.04) 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  letterSpacing: 4,
                  fontWeight: 700,
                  color: "#111111",
                }}
              >
                NEEDLE
              </div>
              <div
                style={{
                  width: 112,
                  height: 10,
                  background: "#d05a36",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
