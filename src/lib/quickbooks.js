import OAuthClient from "intuit-oauth";

export function getQuickBooksClient() {
  const { QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } =
    process.env;

  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET || !QB_REDIRECT_URI) {
    throw new Error("QuickBooks environment variables are missing.");
  }

  return new OAuthClient({
    clientId: QB_CLIENT_ID,
    clientSecret: QB_CLIENT_SECRET,
    environment: "sandbox",
    redirectUri: QB_REDIRECT_URI,
    logging: false,
  });
}