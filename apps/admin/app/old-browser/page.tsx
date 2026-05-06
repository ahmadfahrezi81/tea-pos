export default function OldBrowserPage() {
    // const searchParams = new URLSearchParams(
    //     typeof window !== "undefined" ? window.location.search : ""
    // );
    // const tenant = searchParams.get("tenant") || "";

    const legacyUrl = `/lite-legacy-client/index.html`;

    return (
        <div
            style={{
                fontFamily: "Arial, sans-serif",
                maxWidth: "500px",
                margin: "0 auto",
                padding: "32px 16px",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 24px",
                    background: "#f0f0f0",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "40px",
                }}
            >
                ⚠️
            </div>

            <h1
                style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginBottom: "16px",
                    color: "#000",
                }}
            >
                Browser Update Required
            </h1>

            <p
                style={{
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#666",
                    marginBottom: "24px",
                }}
            >
                Your current browser or device is not supported by the modern
                version of this app.
            </p>

            <div
                style={{
                    background: "#f5f5f5",
                    border: "2px solid #000",
                    padding: "20px",
                    marginBottom: "24px",
                    textAlign: "left",
                }}
            >
                <h2
                    style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        marginBottom: "12px",
                    }}
                >
                    Options:
                </h2>

                <div style={{ marginBottom: "16px" }}>
                    <h3
                        style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            marginBottom: "4px",
                        }}
                    >
                        1. Use Legacy Client
                    </h3>
                    <p
                        style={{
                            fontSize: "13px",
                            color: "#666",
                            marginBottom: "8px",
                        }}
                    >
                        Access a simplified version designed for older devices
                    </p>
                    <a
                        href={legacyUrl}
                        style={{
                            display: "inline-block",
                            background: "#000",
                            color: "#fff",
                            padding: "10px 20px",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "14px",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        Open Legacy Client →
                    </a>
                </div>

                <div>
                    <h3
                        style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            marginBottom: "4px",
                        }}
                    >
                        2. Update Your Browser
                    </h3>
                    <p
                        style={{
                            fontSize: "13px",
                            color: "#666",
                        }}
                    >
                        Update to the latest version of Chrome, Firefox, or
                        Safari
                    </p>
                </div>
            </div>

            <div
                style={{
                    fontSize: "12px",
                    color: "#999",
                    borderTop: "1px solid #ddd",
                    paddingTop: "16px",
                }}
            >
                <p style={{ marginBottom: "8px" }}>
                    <strong>Bahasa Indonesia:</strong>
                </p>
                <p>
                    Browser Anda tidak didukung. Silakan gunakan Legacy Client
                    atau perbarui browser Anda.
                </p>
            </div>
        </div>
    );
}
