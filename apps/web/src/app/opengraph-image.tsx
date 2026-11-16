import { ImageResponse } from "next/og";

export const alt = "HausCrawl — find a home together";
export const size = { width: 1_200, height: 630 };
export const contentType = "image/png";

const homes = [
  { name: "Maple Hollow", facts: "3 bd · 2 ba · 1,480 sq ft", result: "Everyone likes" },
  { name: "Alder Bend", facts: "2 bd · 1 ba · 960 sq ft", result: "Split opinion" },
  { name: "Northbank", facts: "4 bd · 2.5 ba · 2,050 sq ft", result: "Everyone likes" },
];

function HausCrawlMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="96" fill="#1F2422" />
      <path d="M144 128h64v104h96V128h64v256h-64V288h-96v96h-64z" fill="#FFFFFF" />
    </svg>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#F7F6F2",
        color: "#1F2422",
        padding: "48px 64px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <HausCrawlMark />
          <div style={{ display: "flex", fontSize: 42, fontWeight: 600, letterSpacing: "-0.04em" }}>
            HausCrawl
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 17,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6F7069",
          }}
        >
          Seattle / King County
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 52,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div
            style={{
              display: "flex",
              fontSize: 82,
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
              fontSize: 82,
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.055em",
            }}
          >
            together.
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 26, color: "#6F7069" }}>
            Rate, compare, and decide — privately.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: 292,
            height: 430,
            backgroundColor: "#1F2422",
            borderRadius: 42,
            padding: 7,
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              backgroundColor: "#FFFFFF",
              borderRadius: 36,
              padding: 18,
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: "#6E736D",
                  }}
                >
                  SHARED COLLECTION
                </div>
                <div style={{ display: "flex", marginTop: 5, fontSize: 23, fontWeight: 500 }}>
                  Our first home
                </div>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <div
                  style={{
                    display: "flex",
                    width: 27,
                    height: 27,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    backgroundColor: "#F5F4EF",
                    fontSize: 11,
                  }}
                >
                  Y
                </div>
                <div
                  style={{
                    display: "flex",
                    width: 27,
                    height: 27,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    backgroundColor: "#F5F4EF",
                    fontSize: 11,
                  }}
                >
                  P
                </div>
              </div>
            </div>

            <div style={{ display: "flex", marginTop: 10, fontSize: 12, color: "#6E736D" }}>
              You both like <span style={{ fontWeight: 600, color: "#1F2422" }}>2 of 3</span> homes
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
              {homes.map((home) => (
                <div
                  key={home.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid #E5E2DA",
                    borderRadius: 13,
                    padding: 9,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 46,
                      height: 46,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 9,
                      backgroundColor: "#F5F4EF",
                    }}
                  >
                    <HausCrawlMark />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", fontSize: 14, fontWeight: 600 }}>
                      {home.name}
                    </div>
                    <div style={{ display: "flex", fontSize: 9, color: "#6E736D" }}>
                      {home.facts}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignSelf: "flex-start",
                        marginTop: 2,
                        border: "1px solid #D3CFC4",
                        borderRadius: 12,
                        padding: "3px 7px",
                        fontSize: 8,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#1F2422",
                      }}
                    >
                      {home.result}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #D8D6CE",
          paddingTop: 20,
          fontSize: 17,
          color: "#6F7069",
        }}
      >
        <div style={{ display: "flex" }}>Early access · waitlist open</div>
        <div style={{ display: "flex" }}>No street addresses</div>
      </div>
    </div>,
    { ...size },
  );
}
