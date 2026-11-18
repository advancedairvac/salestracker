import { createHash, randomBytes } from "crypto";

export const INVITATION_DURATION_HOURS = 48;

export function generateInvitationToken() {
  return randomBytes(32).toString("hex");
}

export function hashInvitationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationExpiry() {
  const expiresAt = new Date();

  expiresAt.setHours(
    expiresAt.getHours() + INVITATION_DURATION_HOURS,
  );

  return expiresAt;
}