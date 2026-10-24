
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function getEncryptionKey() {
  const key = process.env.QB_TOKEN_ENCRYPTION_KEY;

  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("A valid 32-byte QuickBooks encryption key is required.");
  }

  return Buffer.from(key, "hex");
}

export function encryptToken(token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptToken(payload) {
  const [ivHex, authTagHex, encryptedHex, ...extra] = payload.split(":");

  if (
    extra.length ||
    !/^[0-9a-f]{24}$/i.test(ivHex ?? "") ||
    !/^[0-9a-f]{32}$/i.test(authTagHex ?? "") ||
    !encryptedHex ||
    !/^(?:[0-9a-f]{2})+$/i.test(encryptedHex)
  ) {
    throw new Error("Invalid encrypted token format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
