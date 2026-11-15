import { ImageResponse } from "next/og";

export const alt = "dwellr — find a home together";
export const size = { width: 1_200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F7F6F2",
          color: "#1F2422",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 600, letterSpacing: "-0.04em" }}>
            dwellr
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6F7069",
            }}
          >
            Seattle / King County
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.055em",
            }}
          >
            Find a home
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.055em",
            }}
          >
            together.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#6F7069" }}>
            Rate, compare, and decide — privately.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #D8D6CE",
            paddingTop: 24,
            fontSize: 20,
            color: "#6F7069",
          }}
        >
          <div style={{ display: "flex" }}>Early access · waitlist open</div>
          <div style={{ display: "flex" }}>No street addresses</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
