const ENCRYPTION_KEY_STRING = "REDACTED_ENCRYPTION_KEY";

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(ENCRYPTION_KEY_STRING);
  const hash = await crypto.subtle.digest("SHA-256", rawKey);
  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(text: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherBytes = new Uint8Array(ciphertext);
  const cipherHex = Array.from(cipherBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return ivHex + ":" + cipherHex;
}

export async function decrypt(encryptedData: string): Promise<string> {
  const parts = encryptedData.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted format");
  const [ivHex, cipherHex] = parts;
  
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
