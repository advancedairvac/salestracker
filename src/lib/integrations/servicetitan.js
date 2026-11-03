import OAuthClient from "intuit-oauth";

export function getQuickBooksClient() {
  const { QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI, QB_ENVIRONMENT } =
    process.env;

  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET || !QB_REDIRECT_URI) {
    throw new Error("QuickBooks environment variables are missing.");
  }

  const environment = QB_ENVIRONMENT || "sandbox";

  if (!["sandbox", "production"].includes(environment)) {
    throw new Error('Invalid QB_ENVIRONMENT. Use "sandbox" or "production".');
  }

  return new OAuthClient({
    clientId: QB_CLIENT_ID,
    clientSecret: QB_CLIENT_SECRET,
    environment,
    redirectUri: QB_REDIRECT_URI,
    logging: false,
  });
}
