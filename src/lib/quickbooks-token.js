import OAuthClient from "intuit-oauth";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/quickbooks-crypto";

function getQuickBooksEnvironment() {
  const environment = process.env.QB_ENVIRONMENT || "sandbox";

  if (!["sandbox", "production"].includes(environment)) {
    throw new Error('Invalid QB_ENVIRONMENT. Use "sandbox" or "production".');
  }

  return environment;
}

function createOAuthClient() {
  const { QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET || !QB_REDIRECT_URI) {
    throw new Error("QuickBooks environment variables are missing.");
  }

  return new OAuthClient({
    clientId: QB_CLIENT_ID,
    clientSecret: QB_CLIENT_SECRET,
    environment: getQuickBooksEnvironment(),
    redirectUri: QB_REDIRECT_URI,
    logging: false,
  });
}

export async function getQuickBooksAccessToken(realmId) {
  const environment = getQuickBooksEnvironment();

  const connection = await prisma.quickBooksConnection.findUnique({
    where: {
      realmId_environment: {
        realmId,
        environment,
      },
    },
  });

  if (!connection) {
    throw new Error(
      `No QuickBooks ${environment} connection found. Please connect the company first.`,
    );
  }

  // Reuse the access token if it remains valid for more than two minutes.
  const refreshBeforeExpiry = 2 * 60 * 1000;

  const accessTokenStillValid =
    connection.accessTokenExpiresAt.getTime() >
    Date.now() + refreshBeforeExpiry;

  if (accessTokenStillValid) {
    return decryptToken(connection.accessTokenEncrypted);
  }

  if (
    connection.refreshTokenExpiresAt &&
    connection.refreshTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw new Error(
      "QuickBooks refresh token has expired. Reconnect required.",
    );
  }

  const oauthClient = createOAuthClient();

  const currentRefreshToken = decryptToken(connection.refreshTokenEncrypted);



// ================

console.info("[QuickBooks] Access token expired or near expiry. Refreshing token.");

const authResponse = await oauthClient.refreshUsingToken(
  currentRefreshToken
);

console.info("[QuickBooks] Token refresh request succeeded.");

// ===================


  const token = authResponse.getToken();

  if (!token.access_token) {
    throw new Error("QuickBooks did not return a new access token.");
  }

  const nextRefreshToken = token.refresh_token || currentRefreshToken;

  const nextRefreshExpiry = token.x_refresh_token_expires_in
    ? new Date(Date.now() + Number(token.x_refresh_token_expires_in) * 1000)
    : connection.refreshTokenExpiresAt;

  const updated = await prisma.quickBooksConnection.update({
    where: {
      realmId_environment: {
        realmId,
        environment,
      },
    },
    data: {
      accessTokenEncrypted: encryptToken(token.access_token),
      refreshTokenEncrypted: encryptToken(nextRefreshToken),
      accessTokenExpiresAt: new Date(
        Date.now() + Number(token.expires_in || 3600) * 1000,
      ),
      refreshTokenExpiresAt: nextRefreshExpiry,
    },
  });

  return decryptToken(updated.accessTokenEncrypted);
}
