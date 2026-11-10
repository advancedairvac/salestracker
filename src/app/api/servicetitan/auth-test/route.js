
export async function GET() {
  const clientId = process.env.SERVICETITAN_CLIENT_ID;
  const clientSecret = process.env.SERVICETITAN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json(
      { success: false, message: "Missing API credentials" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://auth-integration.servicetitan.io/connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("ServiceTitan token request failed:", response.status);

      return Response.json(
        {
          success: false,
          message: "ServiceTitan authentication failed",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    return Response.json({
      success: Boolean(data.access_token),
      message: "ServiceTitan authentication successful",
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    });
  } catch (error) {
    console.error("ServiceTitan connection error:", error.message);

    return Response.json(
      { success: false, message: "Unable to connect to ServiceTitan" },
      { status: 502 }
    );
  }
}
