import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function secret() {
  const value = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim() || "";
  if (value.length < 32) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY en az 32 karakter olmalıdır.");
  return value;
}

function key() { return scryptSync(secret(), "brandflow-social-token-v1", 32); }

export function encryptSocialToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSocialToken(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Sosyal hesap anahtarı okunamadı.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
