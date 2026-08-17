
export async function deriveKey(passphrase, conversationId) {
  const encoder = new TextEncoder();

  const passphraseBytes = encoder.encode(passphrase);

  const saltBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(conversationId));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,  
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
}


export async function encryptMessage(message, key) {
  const encoder = new TextEncoder();

  const messageBytes = encoder.encode(message);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    messageBytes
  );

  const ciphertext = btoa(
    String.fromCharCode(...new Uint8Array(encryptedBuffer))
  );

  const ivBase64 = btoa(
    String.fromCharCode(...iv)
  );

  return {
    ciphertext,
    iv: ivBase64,
  };
}