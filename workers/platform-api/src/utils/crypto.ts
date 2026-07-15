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

// --- 비밀번호 해싱 (PBKDF2-SHA256, 100k iterations) -----------------------
// Workers 런타임(Web Crypto API)에서 bcrypt/argon2 네이티브 바인딩 없이 사용 가능한
// 표준 방식입니다. 저장 포맷: "pbkdf2$<iterations>$<salt_b64>$<hash_b64>"
const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, km, 256);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = new Uint8Array(atob(parts[2]).split('').map(c => c.charCodeAt(0)));
  const expectedHashB64 = parts[3];
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, km, 256);
  const actualHashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  // 타이밍 공격 방지를 위한 상수 시간 비교
  if (actualHashB64.length !== expectedHashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHashB64.length; i++) diff |= actualHashB64.charCodeAt(i) ^ expectedHashB64.charCodeAt(i);
  return diff === 0;
}

// --- 이메일 인증 / 비밀번호 재설정 토큰 -----------------------------------
// 원문 토큰은 이메일로만 전달하고, DB에는 SHA-256 해시만 저장합니다
// (DB가 유출되어도 토큰 자체는 복구 불가).
export function generateVerificationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
