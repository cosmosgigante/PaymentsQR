import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

// Cifrado autenticado AES-256-GCM para secretos sensibles (tokens de cobro).
// La clave deriva de PAYMENTS_ENC_KEY (env var) — NUNCA se guarda en la base ni
// en el repo. Si la base se filtra, el ciphertext es inútil sin esta clave.

function key(): Buffer {
  const raw = process.env.PAYMENTS_ENC_KEY;
  if (!raw || raw.length < 32) {
    throw new Error("PAYMENTS_ENC_KEY no está configurado (mínimo 32 caracteres).");
  }
  return createHash("sha256").update(raw).digest(); // 32 bytes
}

/** Cifra un secreto. Devuelve "iv.tag.ciphertext" (base64, separados por punto). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/** Descifra un bundle generado por encryptSecret. Lanza si fue manipulado (GCM). */
export function decryptSecret(bundle: string): string {
  const [ivB, tagB, ctB] = bundle.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("Bundle de secreto inválido");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}

/** Pista no sensible para mostrar en la UI: "••••1234" (últimos 4). */
export function secretHint(plaintext: string): string {
  const last4 = plaintext.slice(-4);
  return `••••${last4}`;
}
