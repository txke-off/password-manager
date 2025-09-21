const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

export async function deriveKeyPBKDF2(
  password: string,
  saltB64: string,
  iterations = 200_000
) {
  const salt = base64ToBuf(saltB64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

export function randomBase64(bytes = 16) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return bufToBase64(arr.buffer);
}

export async function encryptWithKey(key: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    ciphertext: bufToBase64(ct),
    iv: bufToBase64(iv.buffer),
  };
}

export async function decryptWithKey(key: CryptoKey, ciphertextB64: string, ivB64: string) {
  const ct = base64ToBuf(ciphertextB64);
  const iv = base64ToBuf(ivB64);
  try {
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return dec.decode(plainBuf);
  } catch (err) {
    throw new Error('Decryption failed');
  }
}
