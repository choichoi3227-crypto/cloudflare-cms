// workers/platform-api/src/utils/crypto.ts
export async function encryptApiKey(apiKey: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, km, { name:'AES-GCM', length:256 }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(apiKey));
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length);
  combined.set(salt, 0); combined.set(iv, salt.length); combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}
export async function decryptApiKey(encryptedBase64: string, secret: string): Promise<string> {
  const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
  const salt = combined.slice(0, 16); const iv = combined.slice(16, 28); const data = combined.slice(28);
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, km, { name:'AES-GCM', length:256 }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
